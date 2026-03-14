package com.fontogether.api.service;

import com.fontogether.api.model.domain.Project;
import com.fontogether.api.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final com.fontogether.api.repository.GlyphRepository glyphRepository;
    private final UfoImportService ufoImportService;
    private final UfoExportService ufoExportService;

    @Transactional(readOnly = true)
    public List<Project> getProjectsByUserId(Long userId) {
        return projectRepository.findAllByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Project getProjectById(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));
    }

    @Transactional
    public Long createProjectFromTemplate(Long ownerId, String templateName, String customTitle) {
        String title;
        if (customTitle != null && !customTitle.isEmpty()) {
            title = customTitle;
        } else {
            title = "New Project (" + templateName + ")";
        }
        
        // Korean Template: Load from local UFO
        if ("Korean".equalsIgnoreCase(templateName)) {
            try {
                java.io.File ufoDir = new java.io.File("/app/template/Korean-Hangul.ufo");
                if (!ufoDir.exists()) {
                    ufoDir = new java.io.File("template/Korean-Hangul.ufo");
                }
                
                UfoImportService.UfoData data = ufoImportService.parseUfoDirectory(ufoDir, ownerId, title);
                
                // Save Project
                long startProject = System.currentTimeMillis();
                Long projectId = projectRepository.save(data.project());
                log.info("Project saved in {}ms. ProjectID: {}", System.currentTimeMillis() - startProject, projectId);
                
                // Save Glyphs
                long startGlyphs = System.currentTimeMillis();
                int count = 0;
                for (com.fontogether.api.model.domain.Glyph glyph : data.glyphs()) {
                    glyph.setProjectId(projectId);
                    glyphRepository.save(glyph);
                    count++;
                    if (count % 500 == 0) {
                        log.info("Saved {} glyphs...", count);
                    }
                }
                log.info("Total {} glyphs saved in {}ms", count, System.currentTimeMillis() - startGlyphs);
                return projectId;
            } catch (Exception e) {
                throw new RuntimeException("Failed to create project from Korean template: " + e.getMessage(), e);
            }
        }
        // English Template: Load from local UFO
        else if ("English".equalsIgnoreCase(templateName)) {
            try {
                java.io.File ufoDir = new java.io.File("/app/template/English-Latin.ufo");
                if (!ufoDir.exists()) {
                    ufoDir = new java.io.File("template/English-Latin.ufo");
                }
                
                UfoImportService.UfoData data = ufoImportService.parseUfoDirectory(ufoDir, ownerId, title);
                
                // Save Project
                long startProject = System.currentTimeMillis();
                Long projectId = projectRepository.save(data.project());
                log.info("Project saved in {}ms. ProjectID: {}", System.currentTimeMillis() - startProject, projectId);
                
                // Save Glyphs
                long startGlyphs = System.currentTimeMillis();
                int count = 0;
                for (com.fontogether.api.model.domain.Glyph glyph : data.glyphs()) {
                    glyph.setProjectId(projectId);
                    glyphRepository.save(glyph);
                    count++;
                    if (count % 500 == 0) {
                        log.info("Saved {} glyphs...", count);
                    }
                }
                log.info("Total {} glyphs saved in {}ms", count, System.currentTimeMillis() - startGlyphs);
                return projectId;
            } catch (Exception e) {
                throw new RuntimeException("Failed to create project from English template: " + e.getMessage(), e);
            }
        }
        
        Project project = Project.builder()
                .ownerId(ownerId)
                .title(title)
                .build();

        // 템플릿 데이터 적용 (하드코딩 예시)
        if ("Empty".equalsIgnoreCase(templateName)) {
            project.setMetaInfo("{}");
            project.setFontInfo("{}");
            project.setGroups("{}");
            project.setKerning("{}");
            project.setFeatures("{}");
            project.setLayerConfig("{\"layers\": [{\"name\": \"public.default\", \"color\": \"#000000\"}]}");
        } else if ("Basic".equalsIgnoreCase(templateName)) {
             // 기본 설정이 들어간 템플릿
             project.setMetaInfo("{\"version\": 1, " + "\"creator\": \"Fontogether\"}");
             project.setFontInfo("{\"familyName\": \"New Font\", \"styleName\": \"Regular\"}");
             project.setLayerConfig("{\"layers\": [{\"name\": \"public.default\", \"color\": \"#FF0000\"}]}");
             // 필요하다면 여기서 초기 글리프(A-Z)를 생성해서 GlyphRepository.save() 호출 가능
        } else {
            throw new IllegalArgumentException("Unknown template: " + templateName);
        }

        return projectRepository.save(project);
    }

    @Transactional
    public Long createProjectFromUfo(Long ownerId, org.springframework.web.multipart.MultipartFile file, String customTitle) {
        try {
            UfoImportService.UfoData data = ufoImportService.parseUfoZip(file, ownerId, customTitle);
                        // Save Project
                long startProject = System.currentTimeMillis();
                Long projectId = projectRepository.save(data.project());
                log.info("Project saved in {}ms. ProjectID: {}", System.currentTimeMillis() - startProject, projectId);
                
                // Save Glyphs
                long startGlyphs = System.currentTimeMillis();
                int count = 0;
                for (com.fontogether.api.model.domain.Glyph glyph : data.glyphs()) {
                    glyph.setProjectId(projectId);
                    glyphRepository.save(glyph);
                    count++;
                    if (count % 500 == 0) {
                        log.info("Saved {} glyphs...", count);
                    }
                }
                log.info("Total {} glyphs saved in {}ms", count, System.currentTimeMillis() - startGlyphs);
                return projectId;
        } catch (Exception e) {
            throw new RuntimeException("Failed to import UFO: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void updateProject(Long userId, Long projectId, String newTitle) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        if (!project.getOwnerId().equals(userId)) {
             throw new SecurityException("You are not authorized to update this project");
        }

        project.setTitle(newTitle);
        projectRepository.update(project);
    }

    @Transactional
    public void deleteProject(Long userId, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        if (!project.getOwnerId().equals(userId)) {
             throw new SecurityException("Only the owner can delete the project");
        }

        projectRepository.deleteById(projectId);
    }
    
    @Transactional(readOnly = true)
    public byte[] exportProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        List<com.fontogether.api.model.domain.Glyph> glyphs = glyphRepository.findAllByProjectId(projectId);
        
        return ufoExportService.exportProjectToUfo(project, glyphs);
    }

    /** Returns all projects owned by the user that have at least one collaborator. */
    @Transactional(readOnly = true)
    public List<Project> getOwnedSharedProjects(Long userId) {
        List<Long> ownedIds = projectRepository.findProjectIdsByOwnerId(userId);
        List<Project> result = new java.util.ArrayList<>();
        for (Long id : ownedIds) {
            java.util.List<ProjectRepository.Collaborator> collaborators =
                    projectRepository.findCollaborators(id);
            if (!collaborators.isEmpty()) {
                Project p = projectRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Project not found"));
                p.setCollaborators(collaborators);
                result.add(p);
            }
        }
        return result;
    }

    /** Transfer ownership of projectId from currentOwnerId to newOwnerId (must be a collaborator). */
    @Transactional
    public void transferOwnership(Long currentOwnerId, Long projectId, Long newOwnerId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        if (!project.getOwnerId().equals(currentOwnerId)) {
            throw new SecurityException("Only the owner can transfer ownership");
        }
        // Verify the new owner is a collaborator
        boolean isCollaborator = projectRepository.findCollaborators(projectId)
                .stream().anyMatch(c -> c.getUserId().equals(newOwnerId));
        if (!isCollaborator) {
            throw new IllegalArgumentException("New owner must be a current collaborator");
        }
        projectRepository.transferOwnership(projectId, newOwnerId);
        // Add the previous owner as a collaborator
        projectRepository.addCollaborator(projectId, currentOwnerId, "EDITOR");
    }
}
