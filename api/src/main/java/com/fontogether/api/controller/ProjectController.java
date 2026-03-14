package com.fontogether.api.controller;

import com.fontogether.api.model.domain.Project;
import com.fontogether.api.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Project>> getUserProjects(@PathVariable("userId") Long userId) {
        List<Project> projects = projectService.getProjectsByUserId(userId);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProjectById(@PathVariable("projectId") Long projectId) {
        try {
            Project project = projectService.getProjectById(projectId);
            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @org.springframework.web.bind.annotation.PostMapping("/template")
    public ResponseEntity<?> createProjectFromTemplate(@org.springframework.web.bind.annotation.RequestBody CreateTemplateRequest request) {
        try {
            Long projectId = projectService.createProjectFromTemplate(request.getOwnerId(), request.getTemplateName(), request.getTitle());
            return ResponseEntity.ok(projectId);
        } catch (Exception e) {
            log.error("Error creating project from template: ", e);
            return ResponseEntity.badRequest().body("Creation Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.PostMapping(value = "/ufo", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importProject(
            @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @org.springframework.web.bind.annotation.RequestParam("userId") Long userId,
            @org.springframework.web.bind.annotation.RequestParam(value = "title", required = false) String title) {
        try {
            Long projectId = projectService.createProjectFromUfo(userId, file, title);
            return ResponseEntity.ok(projectId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Import Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.PutMapping("/{projectId}")
    public ResponseEntity<?> updateProject(@org.springframework.web.bind.annotation.PathVariable("projectId") Long projectId, 
                                           @org.springframework.web.bind.annotation.RequestBody UpdateProjectRequest request) {
        try {
            projectService.updateProject(request.getUserId(), projectId, request.getTitle());
            return ResponseEntity.ok("Project updated successfully");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Update Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{projectId}")
    public ResponseEntity<?> deleteProject(@org.springframework.web.bind.annotation.PathVariable("projectId") Long projectId, 
                                           @org.springframework.web.bind.annotation.RequestParam("userId") Long userId) {
        try {
            projectService.deleteProject(userId, projectId);
            return ResponseEntity.ok("Project deleted successfully");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Delete Error: " + e.getMessage());
        }
    }
    
    @org.springframework.web.bind.annotation.GetMapping("/{projectId}/export")
    @SuppressWarnings("null")
    public ResponseEntity<?> exportProject(@org.springframework.web.bind.annotation.PathVariable("projectId") Long projectId) {
        try {
            byte[] zipData = projectService.exportProject(projectId);
            
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"project_" + projectId + ".zip\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                    .body(zipData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Export Error: " + e.getMessage());
        }
    }

    /** Returns all projects where the caller is owner AND at least one collaborator exists. */
    @org.springframework.web.bind.annotation.GetMapping("/user/{userId}/owned-shared")
    public ResponseEntity<?> getOwnedSharedProjects(@PathVariable("userId") Long userId) {
        try {
            List<Project> projects = projectService.getOwnedSharedProjects(userId);
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /** Transfer ownership of a project to a collaborator. */
    @org.springframework.web.bind.annotation.PostMapping("/{projectId}/transfer-owner")
    public ResponseEntity<?> transferOwner(
            @PathVariable("projectId") Long projectId,
            @org.springframework.web.bind.annotation.RequestBody TransferOwnerRequest request) {
        try {
            projectService.transferOwnership(request.getCurrentOwnerId(), projectId, request.getNewOwnerId());
            return ResponseEntity.ok("Ownership transferred");
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @lombok.Data
    public static class TransferOwnerRequest {
        private Long currentOwnerId;
        private Long newOwnerId;
    }

    @lombok.Data
    public static class UpdateProjectRequest {
        private Long userId;
        private String title;
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CreateTemplateRequest {
        private Long ownerId;
        private String templateName; // "Empty", "Basic"
        private String title;
    }
}
