package com.fontogether.api.controller;

import com.fontogether.api.model.dto.GlyphUpdateMessage;
import com.fontogether.api.model.dto.UserPresenceMessage;
import com.fontogether.api.service.CollaborationService;
import com.fontogether.api.service.GlyphService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

/**
 * WebSocket 메시지 처리 컨트롤러
 * 클라이언트가 /app/* 경로로 메시지를 보내면 여기서 처리
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final CollaborationService collaborationService;
    private final GlyphService glyphService;

    /**
     * 클라이언트가 글리프 업데이트를 보냈을 때
     * /app/glyph/update 로 메시지 전송
     */
    @MessageMapping("/glyph/update")
    public void handleGlyphUpdate(@Payload GlyphUpdateMessage message, SimpMessageHeaderAccessor headerAccessor) {
        log.info("Received glyph update: projectId={}, unicodes={}, userId={}", 
                message.getProjectId(), message.getUnicodes(), message.getUserId());

        // 1. DB에 저장
        try {
            glyphService.saveGlyph(
                    message.getProjectId(),
                    message.getGlyphName(),
                    message.getOutlineData(), // Changed from getPathData
                    message.getAdvanceWidth(),
                    message.getUnicodes()
            );

            // 2. 타임스탬프 설정 (없으면 현재 시간으로)
            if (message.getTimestamp() == null) {
                message.setTimestamp(System.currentTimeMillis());
            }

            // 3. 프로젝트의 모든 사용자에게 브로드캐스트
            collaborationService.broadcastGlyphUpdate(message.getProjectId(), message);
        } catch (Exception e) {
            log.error("Error handling glyph update", e);
        }
    }

    /**
     * 사용자가 프로젝트에 접속했을 때
     * /app/project/join 로 메시지 전송
     */
    @MessageMapping("/project/join")
    public void handleProjectJoin(@Payload UserPresenceMessage message, SimpMessageHeaderAccessor headerAccessor) {
        log.info("User {} joining project {}", message.getUserId(), message.getProjectId());
        
        // Debug Headers
        log.info("Join Headers: {}", headerAccessor.getMessageHeaders());
        log.info("Join Session ID: {}", headerAccessor.getSessionId());

        collaborationService.userJoined(
                message.getProjectId(),
                message.getUserId(),
                message.getNickname(),
                headerAccessor.getSessionId()
        );
    }

    /**
     * 사용자가 프로젝트에서 나갔을 때
     * /app/project/leave 로 메시지 전송
     */
    @MessageMapping("/project/leave")
    public void handleProjectLeave(@Payload UserPresenceMessage message, SimpMessageHeaderAccessor headerAccessor) {
        log.info("User {} leaving project {}", message.getUserId(), message.getProjectId());
        collaborationService.userLeft(
                message.getProjectId(),
                message.getUserId(),
                message.getNickname()
        );
    }

    /**
     * 사용자가 글리프 편집을 시작했을 때
     * /app/glyph/start-editing 로 메시지 전송
     */
    @MessageMapping("/glyph/start-editing")
    public void handleStartEditing(@Payload UserPresenceMessage message) {
        log.info("User {} started editing glyph {} in project {}", 
                message.getUserId(), message.getEditingUnicode(), message.getProjectId());
        collaborationService.userStartedEditing(
                message.getProjectId(),
                message.getUserId(),
                message.getNickname(),
                message.getEditingUnicode()
        );
    }

    /**
     * 사용자가 글리프 편집을 중단했을 때
     * /app/glyph/stop-editing 로 메시지 전송
     */
    @MessageMapping("/glyph/stop-editing")
    public void handleStopEditing(@Payload UserPresenceMessage message) {
        log.info("User {} stopped editing in project {}", message.getUserId(), message.getProjectId());
        collaborationService.userStoppedEditing(
                message.getProjectId(),
                message.getUserId(),
                message.getNickname()
        );
    }

    /**
     * 프로젝트 상세 정보(메타데이터, 커닝 등) 업데이트
     * /app/project/update/details 로 메시지 전송
     */
    @MessageMapping("/project/update/details")
    public void handleProjectDetailUpdate(@Payload com.fontogether.api.model.dto.ProjectDetailUpdateMessage message) {
        log.info("Project detail update: projectId={}, type={}", message.getProjectId(), message.getUpdateType());
        collaborationService.persistProjectDetail(message);
    }

    /**
     * 글리프 생성, 삭제, 이름변경, 순서변경 (관리 작업)
     * /app/glyph/action
     */
    @MessageMapping("/glyph/action")
    public void handleGlyphAction(@Payload com.fontogether.api.model.dto.GlyphActionMessage message) {
        log.info("Glyph action: projectId={}, action={}, glyph={}", message.getProjectId(), message.getAction(), message.getGlyphName());
        collaborationService.handleGlyphAction(message);
    }
}
