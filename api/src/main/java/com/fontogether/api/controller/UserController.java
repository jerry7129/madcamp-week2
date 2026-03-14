package com.fontogether.api.controller;

import com.fontogether.api.model.domain.User;
import com.fontogether.api.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
/**
 * 사용자 관련 REST API 컨트롤러
 * - 회원가입, 로그인 엔드포인트 제공
 */
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            Long userId = userService.signUp(request.getEmail(), request.getPassword(), request.getNickname());
            return ResponseEntity.ok(userId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Signup Error: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            User user = userService.login(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Login Error: " + e.getMessage());
        }
    }

    @Data
    public static class SignupRequest {
        private String email;
        private String password;
        private String nickname;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }
    @GetMapping("/{userId}")
    public ResponseEntity<User> getUser(@PathVariable("userId") Long userId) {
        try {
            User user = userService.getUser(userId);
            // Hide password
            user.setPassword(null);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            // In a real app, use @ControllerAdvice or strict error DTOs
            return ResponseEntity.badRequest().build(); 
        }
    }

    @org.springframework.web.bind.annotation.PutMapping("/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable("userId") Long userId, @RequestBody UpdateRequest request) {
        try {
            userService.updateUser(userId, request.getNickname(), null); // Password update moved to dedicated endpoint
            return ResponseEntity.ok("User updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Update Error: " + e.getMessage());
        }
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable("userId") Long userId) {
        try {
            userService.deleteUser(userId);
            return ResponseEntity.ok("User deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Delete Error: " + e.getMessage());
        }
    }

    @Data
    public static class UpdateRequest {
        private String nickname;
        // private String password; // Removed password from generic update, explicit endpoint preferred
    }
    
    @PostMapping("/{userId}/password")
    public ResponseEntity<?> changePassword(@PathVariable("userId") Long userId, @RequestBody PasswordChangeRequest request) {
        try {
            userService.changePassword(userId, request.getOldPassword(), request.getNewPassword());
            return ResponseEntity.ok("Password changed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Password Change Error: " + e.getMessage());
        }
    }

    @Data
    public static class PasswordChangeRequest {
        private String oldPassword;
        private String newPassword;
    }
}
