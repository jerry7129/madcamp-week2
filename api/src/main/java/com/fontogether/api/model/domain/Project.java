package com.fontogether.api.model.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {
    // DB Columns matching font_project table
    private Long projectId;
    private String title;
    private Long ownerId;
    
    // UFO Property Lists (Stored as JSON Strings)
    private String metaInfo;    // metainfo.plist
    private String fontInfo;    // fontinfo.plist
    private String groups;      // groups.plist
    private String kerning;     // kerning.plist
    private String features;    // features.fea
    private String layerConfig; // layercontents.plist
    private String lib;         // lib.plist
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Transient fields for API response
    private String role;      // OWNER, EDITOR, VIEWER
    private Boolean isShared; // true if not owner OR has collaborators
    private String ownerNickname;
    private String ownerEmail;
    private java.util.List<com.fontogether.api.repository.ProjectRepository.Collaborator> collaborators;
}
