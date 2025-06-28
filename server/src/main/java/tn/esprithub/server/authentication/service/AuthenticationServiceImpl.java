package tn.esprithub.server.authentication.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprithub.server.authentication.dto.AuthResponse;
import tn.esprithub.server.authentication.dto.GitHubTokenRequest;
import tn.esprithub.server.authentication.dto.LoginRequest;
import tn.esprithub.server.authentication.dto.RefreshTokenRequest;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.user.repository.UserRepository;
import tn.esprithub.server.authentication.util.AuthMapper;
import tn.esprithub.server.common.exception.BusinessException;
import tn.esprithub.server.security.service.JwtService;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthenticationServiceImpl implements IAuthenticationService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final GitHubService gitHubService;
    private final AuthMapper authMapper;

    @Override
    public AuthResponse login(LoginRequest request) {
        log.info("Attempting login for user: {}", request.getEmail());

        // Authenticate user credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // Fetch user from database
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Update last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Generate tokens
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("Login successful for user: {}", request.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(authMapper.toUserDto(user))
                .build();
    }

    @Override
    public AuthResponse linkGitHubAccount(GitHubTokenRequest request, String userEmail) {
        log.info("Linking GitHub account for user: {}", userEmail);

        // Validate state parameter (CSRF protection)
        if (request.getState() == null || request.getState().trim().isEmpty()) {
            throw new BusinessException("Invalid OAuth state parameter");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new BusinessException("User not found"));

        // Exchange code for GitHub access token
        String githubToken = gitHubService.exchangeCodeForToken(request);

        // Get GitHub user information
        Map<String, Object> githubUser = gitHubService.getGitHubUser(githubToken);
        String githubUsername = (String) githubUser.get("login");

        // Validate GitHub username
        if (githubUsername == null || githubUsername.trim().isEmpty()) {
            throw new BusinessException("Invalid GitHub user information");
        }

        // Get GitHub user email and validate it matches the Esprit account (case-insensitive)
        String githubEmail = gitHubService.getGitHubUserEmail(githubToken);
        
        log.info("Email comparison: Esprit='{}', GitHub='{}'", userEmail, githubEmail);
        log.info("Case-insensitive comparison result: {}", userEmail.equalsIgnoreCase(githubEmail));
        
        if (!userEmail.equalsIgnoreCase(githubEmail)) {
            log.warn("GitHub email mismatch for user {}: GitHub email {} does not match Esprit email {}", 
                     userEmail, githubEmail, userEmail);
            throw new BusinessException(
                "GitHub email (" + githubEmail + ") does not match your Esprit account email (" + userEmail + "). " +
                "Please ensure your GitHub account uses the same email address as your Esprit account."
            );
        }

        // Check if GitHub account is already linked to another user
        if (userRepository.existsByGithubUsername(githubUsername)) {
            throw new BusinessException("This GitHub account is already linked to another user");
        }

        // Update user with GitHub information
        user.setGithubToken(githubToken);
        user.setGithubUsername(githubUsername);
        userRepository.save(user);

        // Generate new tokens
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("GitHub account linked successfully for user: {} with GitHub username: {}", userEmail, githubUsername);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(authMapper.toUserDto(user))
                .build();
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String userEmail = jwtService.extractUsername(request.getRefreshToken());
        
        if (userEmail == null) {
            throw new BusinessException("Invalid refresh token");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new BusinessException("User not found"));

        if (!jwtService.isTokenValid(request.getRefreshToken(), user)) {
            throw new BusinessException("Invalid refresh token");
        }

        String accessToken = jwtService.generateToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken)
                .user(authMapper.toUserDto(user))
                .build();
    }

    @Override
    public void logout(String userEmail) {
        log.info("Logging out user: {}", userEmail);
        // In a more advanced implementation, you might want to blacklist the JWT tokens
        // For now, we'll just log the logout action
    }

    @Override
    public boolean validateGitHubToken(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new BusinessException("User not found"));

        if (user.getGithubToken() == null) {
            return false;
        }

        return gitHubService.validateGitHubToken(user.getGithubToken());
    }
}
