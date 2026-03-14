package com.fontogether.api.service;

import com.fontogether.api.model.domain.User;
import com.fontogether.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
/**
 * 사용자 비즈니스 로직 서비스
 * - 회원가입 (중복 이메일 체크)
 * - 로그인 (비밀번호 확인)
 */
public class UserService {

    private final UserRepository userRepository;
    private final com.fontogether.api.repository.ProjectRepository projectRepository; // Inject ProjectRepository
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Transactional
    public Long signUp(String email, String password, String nickname) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        // 비밀번호 암호화 (BCrypt)
        String encodedPassword = passwordEncoder.encode(password);

        User newUser = User.builder()
                .email(email)
                .password(encodedPassword)
                .nickname(nickname)
                .build();

        return userRepository.save(newUser);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        // 암호화된 비밀번호 비교
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        
        return user;
    }
    public User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional
    public void updateUser(Long userId, String nickname, String password) {
        User user = getUser(userId);

        if (nickname != null && !nickname.isEmpty()) {
            user.setNickname(nickname);
        }
        
        if (password != null && !password.isEmpty()) {
            user.setPassword(passwordEncoder.encode(password));
        }

        userRepository.update(user); // MyBatis/JdbcTemplate should implement this
    }

    @Transactional
    public void deleteUser(Long userId) {
        // Check if this user still owns projects with collaborators.
        // Frontend must resolve these first (transfer ownership or delete).
        java.util.List<Long> ownedIds = projectRepository.findProjectIdsByOwnerId(userId);
        for (Long projectId : ownedIds) {
            if (!projectRepository.findCollaborators(projectId).isEmpty()) {
                throw new IllegalStateException(
                    "You still own projects with collaborators. " +
                    "Please transfer ownership or delete those projects first.");
            }
        }

        // Delete all solo projects (no collaborators)
        for (Long projectId : ownedIds) {
            projectRepository.deleteById(projectId);
        }

        // Deleting the user also cascade-removes their project_collaborators entries
        userRepository.deleteById(userId);
    }
    
    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = getUser(userId);
        
        // 1. Verify old password
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Incorrect old password");
        }
        
        // 2. Hash new password
        String newEncryptedPassword = passwordEncoder.encode(newPassword);
        
        // 3. Update DB
        userRepository.updatePassword(userId, newEncryptedPassword);
    }
}
