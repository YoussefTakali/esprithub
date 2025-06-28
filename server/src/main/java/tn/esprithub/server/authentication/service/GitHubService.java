package tn.esprithub.server.authentication.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import tn.esprithub.server.authentication.dto.GitHubTokenRequest;
import tn.esprithub.server.common.exception.BusinessException;
import tn.esprithub.server.config.GitHubProperties;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GitHubService {

    private static final String ACCEPT_HEADER = "Accept";
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String GITHUB_API_ACCEPT = "application/vnd.github.v3+json";
    private static final String JSON_ACCEPT = "application/json";

    private final WebClient webClient;
    private final GitHubProperties gitHubProperties;

    public String exchangeCodeForToken(GitHubTokenRequest request) {
        String githubClientId = gitHubProperties.getId();
        String githubClientSecret = gitHubProperties.getSecret();
        log.info("Attempting to exchange code for token with client_id: {}", githubClientId);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> tokenResponse = webClient.post()
                    .uri("https://github.com/login/oauth/access_token")
                    .header(ACCEPT_HEADER, JSON_ACCEPT)
                    .bodyValue(Map.of(
                            "client_id", githubClientId,
                            "client_secret", githubClientSecret,
                            "code", request.getCode()
                    ))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (tokenResponse != null && tokenResponse.containsKey("access_token")) {
                return (String) tokenResponse.get("access_token");
            } else {
                log.error("Failed to exchange code for token: {}", tokenResponse);
                throw new BusinessException("Failed to obtain GitHub access token");
            }
        } catch (Exception e) {
            log.error("Error exchanging GitHub code for token", e);
            throw new BusinessException("GitHub authentication failed");
        }
    }

    public Map<String, Object> getGitHubUser(String accessToken) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> user = webClient.get()
                    .uri("https://api.github.com/user")
                    .header(AUTHORIZATION_HEADER, "Bearer " + accessToken)
                    .header(ACCEPT_HEADER, GITHUB_API_ACCEPT)
                    .retrieve()
                    .onStatus(HttpStatus.UNAUTHORIZED::equals, 
                            response -> Mono.error(new BusinessException("Invalid GitHub token")))
                    .bodyToMono(Map.class)
                    .block();
            return user;
        } catch (Exception e) {
            log.error("Error fetching GitHub user", e);
            throw new BusinessException("Failed to fetch GitHub user information");
        }
    }

    public String getGitHubUserEmail(String accessToken) {
        try {
            // Get primary email from GitHub API
            Object[] emails = webClient.get()
                    .uri("https://api.github.com/user/emails")
                    .header(AUTHORIZATION_HEADER, "Bearer " + accessToken)
                    .header(ACCEPT_HEADER, GITHUB_API_ACCEPT)
                    .retrieve()
                    .onStatus(HttpStatus.UNAUTHORIZED::equals, 
                            response -> Mono.error(new BusinessException("Invalid GitHub token")))
                    .bodyToMono(Object[].class)
                    .block();

            if (emails != null && emails.length > 0) {
                // Find the primary email
                for (Object emailObj : emails) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> emailMap = (Map<String, Object>) emailObj;
                    Boolean isPrimary = (Boolean) emailMap.get("primary");
                    Boolean isVerified = (Boolean) emailMap.get("verified");
                    
                    if (Boolean.TRUE.equals(isPrimary) && Boolean.TRUE.equals(isVerified)) {
                        return (String) emailMap.get("email");
                    }
                }
                
                // If no primary email found, return the first verified email
                for (Object emailObj : emails) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> emailMap = (Map<String, Object>) emailObj;
                    Boolean isVerified = (Boolean) emailMap.get("verified");
                    
                    if (Boolean.TRUE.equals(isVerified)) {
                        return (String) emailMap.get("email");
                    }
                }
            }
            
            throw new BusinessException("No verified email found in GitHub account");
        } catch (Exception e) {
            log.error("Error fetching GitHub user email", e);
            throw new BusinessException("Failed to fetch GitHub user email");
        }
    }

    public boolean validateGitHubToken(String accessToken) {
        try {
            Map<String, Object> user = getGitHubUser(accessToken);
            return user != null && user.containsKey("login");
        } catch (Exception e) {
            log.warn("GitHub token validation failed", e);
            return false;
        }
    }
}
