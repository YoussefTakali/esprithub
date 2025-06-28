package tn.esprithub.server.authentication.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/github")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class GitHubController {

    @Value("${spring.security.oauth2.client.registration.github.client-id}")
    private String githubClientId;

    private static final String GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
    private static final String REDIRECT_URI = "http://localhost:4200/auth/github/callback";
    private static final String SCOPE = "user:email"; // Minimal scope for security

    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, String>> getGitHubAuthUrl() {
        log.info("Generating GitHub OAuth URL");

        // Generate a random state parameter for security
        String state = UUID.randomUUID().toString();

        // Build the GitHub authorization URL
        String authUrl = GITHUB_AUTH_URL +
                "?client_id=" + githubClientId +
                "&redirect_uri=" + URLEncoder.encode(REDIRECT_URI, StandardCharsets.UTF_8) +
                "&scope=" + URLEncoder.encode(SCOPE, StandardCharsets.UTF_8) +
                "&state=" + state;

        log.info("Generated GitHub auth URL with state: {}", state);

        return ResponseEntity.ok(Map.of(
                "authUrl", authUrl,
                "state", state
        ));
    }
}
