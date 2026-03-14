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
public class Glyph {
    private java.util.UUID glyphUuid;
    private Long projectId;
    private String layerName;
    private String glyphName;
    private Integer formatVersion;
    private java.util.List<String> unicodes;
    private Integer advanceWidth;
    private Integer advanceHeight;
    private Integer sortOrder;
    private String outlineData;      // JSON 데이터 (베지에 곡선 정보)
    private String properties;       // JSONB properties
    private String lastModifiedBy;
    private LocalDateTime updatedAt;
}