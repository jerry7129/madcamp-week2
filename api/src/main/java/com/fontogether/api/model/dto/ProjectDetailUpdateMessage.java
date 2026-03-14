package com.fontogether.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 프로젝트 상세 정보 업데이트 메시지 (WebSocket)
 * Kerning, Groups, MetaInfo, FontInfo 등의 JSON 데이터 동기화용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDetailUpdateMessage {
    private Long projectId;
    private Long userId;     // 수정자
    private String updateType; // "META_INFO", "FONT_INFO", "GROUPS", "KERNING", "FEATURES", "LAYER_CONFIG"
    private String data;     // JSON String or Content
}
