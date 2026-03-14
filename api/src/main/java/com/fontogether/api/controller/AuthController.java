package com.fontogether.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fontogether.api.model.domain.User;
import com.fontogether.api.repository.UserRepository;
import com.fontogether.api.service.GoogleAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleAuthService googleAuthService;
    private final UserRepository userRepository;

    @PostMapping("/google/verify")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String code = body.get("code");
        String redirectUri = body.get("redirectUri"); // Optional

        if (code == null) {
            return ResponseEntity.badRequest().body("Authorization code is missing");
        }

        // 1. Code -> Access Token
        String accessToken = googleAuthService.getAccessToken(code, redirectUri);
        if (accessToken == null) {
            return ResponseEntity.status(401).body("Failed to retrieve access token");
        }

        // 2. Token -> User Info
        JsonNode userInfo = googleAuthService.getUserInfo(accessToken);
        if (userInfo == null) {
            return ResponseEntity.status(401).body("Failed to retrieve user info");
        }

        String email = userInfo.path("email").asText();
        String name = userInfo.path("name").asText();
        String providerId = userInfo.path("id").asText(); // Google ID

        log.info("Google Login: email={}, name={}", email, name);

        // 3. Find or Create User
        User user = saveOrUpdateUser(email, name, "google", providerId);

        // 4. Return User object (JWT generation shifted to Next.js)
        return ResponseEntity.ok(user);
    }

    private User saveOrUpdateUser(String email, String name, String provider, String providerId) {
        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isPresent()) {
            return existingUser.get();
        } else {
            User newUser = User.builder()
                    .email(email)
                    .nickname(name)
                    .provider(provider)
                    .providerId(providerId)
                    .build();
            Long id = userRepository.save(newUser);
            newUser.setId(id);
            return newUser;
        }
    }
}
