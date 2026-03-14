package com.fontogether.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlyphActionMessage {
    private Long projectId;
    private Long userId;
    private String nickname;
    
    private ActionType action; // ADD, DELETE, RENAME, REORDER
    
    // For ADD, DELETE, RENAME
    private String glyphName;
    
    // For RENAME
    private String newName;
    
    // For REORDER
    private List<String> newOrder;
    
    // For MOVE
    private Integer toIndex;
    
    public enum ActionType {
        ADD, DELETE, RENAME, REORDER, MOVE
    }
}
