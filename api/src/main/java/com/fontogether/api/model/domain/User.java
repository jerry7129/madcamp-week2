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
public class User {
    private Long id;
    private String email;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;
    private String nickname;
    private String provider;   // "local" only
    private String providerId; // null or local id
    private LocalDateTime createdAt;
}