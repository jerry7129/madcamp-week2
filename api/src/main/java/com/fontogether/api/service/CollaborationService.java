package com.fontogether.api.service;

import com.fontogether.api.model.domain.Project;
import com.fontogether.api.repository.ProjectRepository;
import com.fontogether.api.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final GlyphService glyphService;

    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public List<ProjectRepository.Collaborator> getCollaborators(Long projectId) {
        return projectRepository.findCollaborators(projectId);
    }

    @Transactional
    public void addCollaborator(Long requesterId, Long projectId, String email, String role) {
        verifyOwner(requesterId, projectId);
        
        Long userIdToAdd = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email))
                .getId();

        projectRepository.addCollaborator(projectId, userIdToAdd, role);
    }

    @Transactional
    public void updateCollaboratorRole(Long requesterId, Long projectId, Long targetUserId, String newRole) {
        verifyOwner(requesterId, projectId);
        projectRepository.updateCollaboratorRole(projectId, targetUserId, newRole);
    }

    @Transactional
    public void removeCollaborator(Long requesterId, Long projectId, Long targetUserId) {
        // Owner can remove anyone.
        // User can remove themselves (Leave project).
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        if (!project.getOwnerId().equals(requesterId) && !requesterId.equals(targetUserId)) {
            throw new SecurityException("Not authorized to remove this collaborator");
        }

        projectRepository.removeCollaborator(projectId, targetUserId);
        
        // Notify clients via WebSocket
        broadcastKick(projectId, targetUserId);
    }

    private void verifyOwner(Long userId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        if (!project.getOwnerId().equals(userId)) {
            throw new SecurityException("Only owner can perform this action");
        }
    }

    private void broadcastKick(Long projectId, Long kickedUserId) {
        // Topic: /topic/project/{projectId}/kick
        // Payload: { "kickedUserId": 123 }
        String destination = "/topic/project/" + projectId + "/kick";
        java.util.Map<String, Long> payload = java.util.Collections.singletonMap("kickedUserId", kickedUserId);
        messagingTemplate.convertAndSend(destination, payload);
    }

    // --- WebSocket Event Handlers ---

    // --- Session Tracking ---
    // ProjectID -> Set<SessionID> (For efficient counting)
    private final java.util.Map<Long, java.util.Set<String>> projectSessions = new java.util.concurrent.ConcurrentHashMap<>();
    
    // SessionID -> SessionInfo (For lookup on disconnect)
    private final java.util.Map<String, SessionInfo> sessionMap = new java.util.concurrent.ConcurrentHashMap<>();

    private record SessionInfo(Long projectId, Long userId, String nickname) {}

    @org.springframework.context.event.EventListener
    public void handleSessionConnect(org.springframework.web.socket.messaging.SessionConnectEvent event) {
        org.springframework.messaging.simp.stomp.StompHeaderAccessor items = org.springframework.messaging.simp.stomp.StompHeaderAccessor.wrap(event.getMessage());
        org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
            "Session Connected Event: sid={}", items.getSessionId()
        );
    }

    public void userJoined(Long projectId, Long userId, String nickname, String sessionId) {
        // Track session
        sessionMap.put(sessionId, new SessionInfo(projectId, userId, nickname));
        
        // Track project sessions atomically and capture count
        java.util.concurrent.atomic.AtomicInteger activeCount = new java.util.concurrent.atomic.AtomicInteger(0);
        projectSessions.compute(projectId, (key, sessions) -> {
            if (sessions == null) {
                sessions = java.util.concurrent.ConcurrentHashMap.newKeySet();
            }
            sessions.add(sessionId);
            activeCount.set(countUniqueUsers(sessions));
            return sessions;
        });

        // Debug Log
        // Debug Log
        org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
            "User Joined: pid={}, uid={}, sid={}, activeCount={}", 
            projectId, userId, sessionId, activeCount.get()
        );

        // Broadcast to /topic/project/{projectId}/presence
        broadcastPresence(projectId, userId, nickname, "JOIN", activeCount.get());
    }

    // @org.springframework.scheduling.annotation.Scheduled(fixedRate = 30000)
    public void monitorSessionIntegrity() {
        int sessionMapSize = sessionMap.size();
        int projectSessionsSize = projectSessions.values().stream().mapToInt(java.util.Set::size).sum();
        
        if (sessionMapSize != projectSessionsSize) {
             org.slf4j.LoggerFactory.getLogger(CollaborationService.class).warn(
                "Session Count Mismatch detected! sessionMapSize={}, projectSessionsSize={}", 
                sessionMapSize, projectSessionsSize
            );
        } else {
             org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
                "Session Monitor: Integrity OK. Count={}", sessionMapSize
            );
        }
    }

    public void userLeft(Long projectId, Long userId, String nickname) {
        // Manual user left logic if needed (usually handled by disconnect)
    }

    @org.springframework.context.event.EventListener
    public void handleSessionDisconnect(org.springframework.web.socket.messaging.SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        SessionInfo info = sessionMap.remove(sessionId);
        
        if (info != null) {
            java.util.concurrent.atomic.AtomicInteger activeCount = new java.util.concurrent.atomic.AtomicInteger(-1);
            
            projectSessions.compute(info.projectId(), (key, sessions) -> {
                if (sessions == null) {
                    activeCount.set(0);
                    return null;
                }
                boolean removed = sessions.remove(sessionId);
                int count = countUniqueUsers(sessions);
                activeCount.set(count);
                
                org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
                    "Session Disconnected: pid={}, uid={}, sid={}, removedFromSet={}, activeCount={}, closeStatus={}", 
                    info.projectId(), info.userId(), sessionId, removed, count, event.getCloseStatus()
                );
                return sessions.isEmpty() ? null : sessions;
            });
            
            // Only broadcast if the project set actually existed/we processed it
            if (activeCount.get() != -1) {
                broadcastPresence(info.projectId(), info.userId(), info.nickname(), "LEAVE", activeCount.get());
            }
        } else {
             org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
                "Session Disconnected (Ignored): sid={} (Not in map), closeStatus={}", sessionId, event.getCloseStatus()
            );
        }
    }
    
    // Helper to count unique users in a set of sessions
    private int countUniqueUsers(java.util.Set<String> sessions) {
        if (sessions == null || sessions.isEmpty()) return 0;
        
        java.util.List<Long> uniqueUsers = sessions.stream()
            .map(sessionMap::get)
            .filter(java.util.Objects::nonNull)
            .map(SessionInfo::userId)
            .filter(java.util.Objects::nonNull) // Filter null userIds
            .distinct()
            .toList();
            
        // Debug which users are active
        if (uniqueUsers.size() > 1) {
             org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
                "Active Users Calculation: found {} -> ids={}", uniqueUsers.size(), uniqueUsers
            );
        }
        
        return uniqueUsers.size();
    }


    


    private void broadcastPresence(Long projectId, Long userId, String nickname, String type, int count) {
        String destination = "/topic/project/" + projectId + "/presence";
        
        org.slf4j.LoggerFactory.getLogger(CollaborationService.class).debug(
            "Broadcasting Presence: type={}, pid={}, count={}", type, projectId, count
        );

        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("type", type);
        payload.put("projectId", projectId);
        payload.put("userId", userId);
        payload.put("nickname", nickname);
        payload.put("activeCount", count);
        payload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend(destination, payload);
    }

    public void userStartedEditing(Long projectId, Long userId, String nickname, Integer unicode) {
        String destination = "/topic/project/" + projectId + "/presence";
        messagingTemplate.convertAndSend(destination, java.util.Map.of(
            "type", "START_EDIT",
            "projectId", projectId,
            "userId", userId,
            "nickname", nickname,
            "editingUnicode", unicode
        ));
    }

    public void userStoppedEditing(Long projectId, Long userId, String nickname) {
        String destination = "/topic/project/" + projectId + "/presence";
        messagingTemplate.convertAndSend(destination, java.util.Map.of(
            "type", "STOP_EDIT",
            "projectId", projectId,
            "userId", userId,
            "nickname", nickname
        ));
    }

    public void broadcastGlyphUpdate(Long projectId, Object payload) {
        // Topic: /topic/project/{projectId}/glyph/update
        String destination = "/topic/project/" + projectId + "/glyph/update";
        messagingTemplate.convertAndSend(destination, payload);
    }

    public void persistProjectDetail(com.fontogether.api.model.dto.ProjectDetailUpdateMessage message) {
        // 1. Validate Update Type -> Column
        String column = switch (message.getUpdateType()) {
            case "META_INFO" -> "meta_info";
            case "FONT_INFO" -> "font_info";
            case "GROUPS" -> "groups";
            case "KERNING" -> "kerning";
            case "FEATURES" -> "features";
            case "LAYER_CONFIG" -> "layer_config";
            case "LIB" -> "lib";
            default -> throw new IllegalArgumentException("Unknown update type: " + message.getUpdateType());
        };

        // 2. Persist to DB
        projectRepository.updateProjectDetail(message.getProjectId(), column, message.getData());

        // 3. Broadcast to all clients (including sender, or exclude sender if optimized)
        String destination = "/topic/project/" + message.getProjectId() + "/update/details";
        messagingTemplate.convertAndSend(destination, message);
    }
    
    @Transactional
    public void handleGlyphAction(com.fontogether.api.model.dto.GlyphActionMessage message) {
        Long projectId = message.getProjectId();
        
        switch (message.getAction()) {
            case RENAME:
                glyphService.renameGlyph(projectId, message.getGlyphName(), message.getNewName());
                updateGlyphOrderInLib(projectId, order -> {
                   int idx = order.indexOf(message.getGlyphName());
                   if (idx != -1) {
                       order.set(idx, message.getNewName());
                   }
                   // Sync DB Sort Orders
                   glyphService.updateGlyphOrders(projectId, order);
                });
                break;
                
            case DELETE:
                glyphService.deleteGlyph(projectId, message.getGlyphName());
                updateGlyphOrderInLib(projectId, order -> {
                    order.remove(message.getGlyphName());
                    // Sync DB Sort Orders (Remainders shift up)
                    glyphService.updateGlyphOrders(projectId, order);
                });
                break;
                
            case ADD:
                // Create an empty glyph
                // Determine sortOrder? Ideally, we put it at the end.
                // We use lib order to determine strict ordering.
                
                // 1. First add to Lib to get the "official" new order
                updateGlyphOrderInLib(projectId, order -> {
                    if (!order.contains(message.getGlyphName())) {
                        order.add(message.getGlyphName());
                    }
                    
                    // 2. Now save the glyph with explicit sortOrder? 
                    // Since saveGlyph doesn't take sortOrder yet, we save first then update orders.
                    // Or simpler: Save, then sync all orders.
                    glyphService.saveGlyph(projectId, message.getGlyphName(), "{\"contours\":[]}", 500, java.util.Collections.emptyList());
                    
                    // 3. Sync all sort orders
                    glyphService.updateGlyphOrders(projectId, order);
                });
                break;
                
            case REORDER:
                updateGlyphOrderInLib(projectId, order -> {
                    order.clear();
                    order.addAll(message.getNewOrder());
                    
                    // Sync DB Sort Orders
                    glyphService.updateGlyphOrders(projectId, order);
                });
                break;
                
            case MOVE:
                updateGlyphOrderInLib(projectId, order -> {
                    // 1. Remove if exists
                    order.remove(message.getGlyphName());
                    
                    // 2. Insert at index
                    int idx = message.getToIndex();
                    if (idx < 0) idx = 0;
                    if (idx > order.size()) idx = order.size();
                    
                    order.add(idx, message.getGlyphName());
                    
                    // Sync DB Sort Orders
                    glyphService.updateGlyphOrders(projectId, order);
                });
                break;
        }

        // Broadcast Action
        String destination = "/topic/project/" + projectId + "/glyph/action";
        messagingTemplate.convertAndSend(destination, message);
    }

    @SuppressWarnings("unchecked")
    private void updateGlyphOrderInLib(Long projectId, java.util.function.Consumer<List<String>> modifier) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            // Parse lib JSON
            java.util.Map<String, Object> libMap = new java.util.HashMap<>();
            if (project.getLib() != null && !project.getLib().isEmpty()) {
                libMap = mapper.readValue(project.getLib(), new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {});
            }
            
            // Get or Create public.glyphOrder
            List<String> glyphOrder = (List<String>) libMap.computeIfAbsent("public.glyphOrder", k -> new java.util.ArrayList<String>());
            
            // Apply modification
            modifier.accept(glyphOrder);
            
            // Save back
            String newLibJson = mapper.writeValueAsString(libMap);
            projectRepository.updateProjectDetail(projectId, "lib", newLibJson);
            
            // Also broadcast LIB update so clients sync their lib state
            com.fontogether.api.model.dto.ProjectDetailUpdateMessage libUpdate = new com.fontogether.api.model.dto.ProjectDetailUpdateMessage();
            libUpdate.setProjectId(projectId);
            libUpdate.setUpdateType("LIB");
            libUpdate.setData(newLibJson);
            broadcastProjectDetailUpdate(libUpdate);

        } catch (Exception e) {
            throw new RuntimeException("Failed to update glyph order in lib", e);
        }
    }
    
    private void broadcastProjectDetailUpdate(com.fontogether.api.model.dto.ProjectDetailUpdateMessage message) {
        String destination = "/topic/project/" + message.getProjectId() + "/update/details";
        messagingTemplate.convertAndSend(destination, message);
    }

    public int getActiveUserCount(Long projectId) {
        if (!projectSessions.containsKey(projectId)) return 0;
        return countUniqueUsers(projectSessions.get(projectId));
    }
}
