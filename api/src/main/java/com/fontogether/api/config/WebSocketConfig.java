package com.fontogether.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 1. 클라이언트 연결 엔드포인트
        // ws://localhost:8080/ws 로 연결 요청
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // React(3000번 포트) CORS 허용
                .withSockJS(); // 브라우저 호환성을 위한 SockJS 지원
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 2. 메시지 구독 요청 prefix (Server -> Client)
        // 예: /topic/project/1/glyph/A
        registry.enableSimpleBroker("/topic");

        // 3. 메시지 발행 요청 prefix (Client -> Server)
        // 예: /app/glyph/update
        registry.setApplicationDestinationPrefixes("/app");
    }
}