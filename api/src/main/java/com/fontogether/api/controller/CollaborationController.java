package com.fontogether.api.controller;

import com.fontogether.api.repository.ProjectRepository.Collaborator;
import com.fontogether.api.service.CollaborationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/collaborators")
@RequiredArgsConstructor
public class CollaborationController {

    private final CollaborationService collaborationService;

    @GetMapping
    public ResponseEntity<List<Collaborator>> getCollaborators(@PathVariable("projectId") Long projectId) {
        return ResponseEntity.ok(collaborationService.getCollaborators(projectId));
    }

    @PostMapping
    public ResponseEntity<?> addCollaborator(@PathVariable("projectId") Long projectId,
                                             @RequestBody AddCollaboratorRequest request) {
        try {
            collaborationService.addCollaborator(request.getRequesterId(), projectId, request.getEmail(), request.getRole());
            return ResponseEntity.ok("Collaborator added successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{userId}")
    public ResponseEntity<?> updateCollaborator(@PathVariable("projectId") Long projectId,
                                                @PathVariable("userId") Long userId,
                                                @RequestBody UpdateCollaboratorRequest request) {
        try {
            collaborationService.updateCollaboratorRole(request.getRequesterId(), projectId, userId, request.getRole());
            return ResponseEntity.ok("Role updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> removeCollaborator(@PathVariable("projectId") Long projectId,
                                                @PathVariable("userId") Long targetUserId,
                                                @RequestParam("requesterId") Long requesterId) {
        try {
            collaborationService.removeCollaborator(requesterId, projectId, targetUserId);
            return ResponseEntity.ok("Collaborator removed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @Data
    public static class AddCollaboratorRequest {
        private Long requesterId;
        private String email;
        private String role; // EDITOR, VIEWER
    }

    @Data
    public static class UpdateCollaboratorRequest {
        private Long requesterId;
        private String role;
    }
}
