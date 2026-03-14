package com.fontogether.api.config;


import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import com.fontogether.api.service.CustomOAuth2UserService;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;



    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // 개발 편의를 위해 CSRF 비활성화 (프로덕션에선 검토 필요)
            .cors(cors -> cors.configure(http)) // WebConfig의 CORS 설정 사용
            .authorizeHttpRequests(auth -> auth
                // Public Endpoints
                .requestMatchers("/", "/index.html", "/*.html", "/error", "/ws/**").permitAll()
                .requestMatchers("/api/users/**", "/api/auth/**").permitAll() // 로컬 로그인 & 소셜 인증
                .requestMatchers("/api/projects/**").permitAll() // 프로젝트 API
                .requestMatchers("/test/**").permitAll()      // 테스트용
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService) // 사용자 정보 저장 로직 연결
                )
                .defaultSuccessUrl("/", true) // 로그인 성공 시 리다이렉트
            );
        
        return http.build();
    }
}
