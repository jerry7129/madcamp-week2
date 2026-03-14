package com.fontogether.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 사용자 접속/해제 상태 메시지
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPresenceMessage {
    private Long userId;
    private String nickname;
    private Long projectId;
    private String action;  // "JOIN", "LEAVE", "EDITING" (특정 글리프 편집 중)
    private Integer editingUnicode;  // 편집 중인 글리프의 unicode (action이 "EDITING"일 때)
}
