package com.fontogether.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket을 통해 전송되는 Glyph 업데이트 메시지
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlyphUpdateMessage {
    private Long projectId;
    private java.util.List<String> unicodes;
    private String glyphName;
    private String outlineData;  // JSON 문자열 (contours, components)
    private Integer advanceWidth;
    private Long userId;      // 변경한 사용자 ID
    private String nickname;  // 변경한 사용자 닉네임
    private Long timestamp;   // 변경 시각 (Unix timestamp)
}
