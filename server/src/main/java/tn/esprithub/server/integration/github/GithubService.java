package tn.esprithub.server.integration.github;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

@Service
public class GithubService {

    private static final Logger logger = LoggerFactory.getLogger(GithubService.class);
    private static final String GITHUB_API_REPOS_BASE = "https://api.github.com/repos/";

    @Value("${github.organization.name:}")
    private String organizationName;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String createRepositoryForUser(String repoName, String githubToken) {
        logger.info("Attempting to create repository: {}", repoName);
        
        // First, try to create in organization if configured
        if (organizationName != null && !organizationName.trim().isEmpty()) {
            try {
                return createRepositoryInOrganization(repoName, githubToken);
            } catch (Exception e) {
                logger.warn("Failed to create repository in organization '{}': {}", organizationName, e.getMessage());
            }
        }
        
        // Fallback: create in user's personal account
        try {
            return createRepositoryInUserAccount(repoName, githubToken);
        } catch (Exception e) {
            logger.error("Failed to create repository in user account: {}", e.getMessage());
            throw new RuntimeException("GitHub repository creation failed. Please check your GitHub token and permissions. Error: " + e.getMessage());
        }
    }
    
    private String createRepositoryInOrganization(String repoName, String githubToken) {
        String url = "https://api.github.com/orgs/" + organizationName + "/repos";
        logger.info("Creating repository in organization: {} at URL: {}", organizationName, url);
        
        Map<String, Object> body = new HashMap<>();
        body.put("name", repoName);
        body.put("private", true);
        body.put("auto_init", true);
        body.put("description", "Repository for group project: " + repoName);
        
        HttpHeaders headers = getHeaders(githubToken);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful()) {
            try {
                JsonNode node = objectMapper.readTree(response.getBody());
                String fullName = node.get("full_name").asText();
                logger.info("Successfully created repository in organization: {}", fullName);
                return fullName;
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse GitHub organization repository response", e);
            }
        }
        throw new RuntimeException("Failed to create organization repository: " + response.getBody());
    }
    
    private String createRepositoryInUserAccount(String repoName, String githubToken) {
        String url = "https://api.github.com/user/repos";
        logger.info("Creating repository in user account at URL: {}", url);
        
        Map<String, Object> body = new HashMap<>();
        body.put("name", repoName);
        body.put("private", true);
        body.put("auto_init", true);
        body.put("description", "Repository for group project: " + repoName);
        
        HttpHeaders headers = getHeaders(githubToken);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful()) {
            try {
                JsonNode node = objectMapper.readTree(response.getBody());
                String fullName = node.get("full_name").asText();
                logger.info("Successfully created repository in user account: {}", fullName);
                return fullName;
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse GitHub user repository response", e);
            }
        }
        throw new RuntimeException("Failed to create user repository: " + response.getBody());
    }

    public void inviteUserToRepo(String repoFullName, String githubUsername, String githubToken) {
        try {
            String url = GITHUB_API_REPOS_BASE + repoFullName + "/collaborators/" + githubUsername;
            HttpHeaders headers = getHeaders(githubToken);
            Map<String, Object> body = new HashMap<>();
            body.put("permission", "push");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully invited GitHub user '{}' to repository '{}'", githubUsername, repoFullName);
            } else {
                logger.warn("Failed to invite GitHub user '{}' to repository '{}': {}", githubUsername, repoFullName, response.getBody());
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                logger.warn("GitHub user '{}' not found when inviting to repository '{}'", githubUsername, repoFullName);
            } else if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY) {
                logger.warn("GitHub user '{}' already has access to repository '{}'", githubUsername, repoFullName);
            } else {
                logger.error("Failed to invite GitHub user '{}' to repository '{}': {}", githubUsername, repoFullName, e.getMessage());
            }
        } catch (Exception e) {
            logger.error("Unexpected error inviting GitHub user '{}' to repository '{}': {}", githubUsername, repoFullName, e.getMessage());
        }
    }

    /**
     * Invite a user to a repository by email address
     */
    public void inviteUserByEmailToRepo(String repoFullName, String email, String githubToken) {
        try {
            String url = GITHUB_API_REPOS_BASE + repoFullName + "/invitations";
            HttpHeaders headers = getHeaders(githubToken);
            Map<String, Object> body = new HashMap<>();
            body.put("invitee_id", email);
            body.put("permissions", "push");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully sent repository invitation to email '{}' for repository '{}'", email, repoFullName);
            } else {
                logger.warn("Failed to invite email '{}' to repository '{}': {}", email, repoFullName, response.getBody());
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                logger.warn("Repository '{}' not found when inviting email '{}'", repoFullName, email);
            } else if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY) {
                logger.warn("Email '{}' may already have access to repository '{}' or is invalid", email, repoFullName);
            } else {
                logger.error("Failed to invite email '{}' to repository '{}': {}", email, repoFullName, e.getMessage());
            }
        } catch (Exception e) {
            logger.error("Unexpected error inviting email '{}' to repository '{}': {}", email, repoFullName, e.getMessage());
        }
    }

    public void createBranch(String repoFullName, String branchName, String githubToken) {
        try {
            // Sanitize branch name (GitHub branch naming rules)
            String sanitizedBranchName = branchName
                .toLowerCase()
                .replaceAll("[^a-zA-Z0-9-_./]", "-")  // Replace invalid characters
                .replaceAll("-+", "-")  // Collapse multiple dashes
                .replaceAll("(^-+)|(-+$)", "");  // Remove leading/trailing dashes
            
            if (sanitizedBranchName.isEmpty()) {
                logger.warn("Branch name '{}' resulted in empty sanitized name, using 'student-branch'", branchName);
                sanitizedBranchName = "student-branch";
            }
            
            logger.info("Creating branch '{}' (sanitized from '{}') in repository '{}'", sanitizedBranchName, branchName, repoFullName);
            
            // Get default branch SHA
            String repoUrl = GITHUB_API_REPOS_BASE + repoFullName;
            HttpHeaders headers = getHeaders(githubToken);
            ResponseEntity<String> repoResp = restTemplate.exchange(repoUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            String defaultBranch;
            try {
                JsonNode node = objectMapper.readTree(repoResp.getBody());
                defaultBranch = node.get("default_branch").asText();
                logger.debug("Repository '{}' default branch: {}", repoFullName, defaultBranch);
            } catch (Exception e) {
                logger.error("Failed to parse repository information for '{}': {}", repoFullName, e.getMessage());
                throw new IllegalStateException("Failed to get default branch for repository: " + repoFullName, e);
            }
            
            // Get SHA of default branch
            String branchUrl = repoUrl + "/git/refs/heads/" + defaultBranch;
            ResponseEntity<String> branchResp = restTemplate.exchange(branchUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            String sha;
            try {
                JsonNode node = objectMapper.readTree(branchResp.getBody());
                sha = node.get("object").get("sha").asText();
                logger.debug("Default branch '{}' SHA: {}", defaultBranch, sha);
            } catch (Exception e) {
                logger.error("Failed to parse branch SHA for '{}' branch '{}': {}", repoFullName, defaultBranch, e.getMessage());
                throw new IllegalStateException("Failed to get branch SHA for repository: " + repoFullName, e);
            }
            
            // Create new branch
            String createRefUrl = repoUrl + "/git/refs";
            Map<String, Object> refBody = new HashMap<>();
            refBody.put("ref", "refs/heads/" + sanitizedBranchName);
            refBody.put("sha", sha);
            HttpEntity<Map<String, Object>> refEntity = new HttpEntity<>(refBody, headers);
            
            ResponseEntity<String> createResponse = restTemplate.postForEntity(createRefUrl, refEntity, String.class);
            if (createResponse.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully created branch '{}' in repository '{}'", sanitizedBranchName, repoFullName);
            } else {
                logger.warn("Failed to create branch '{}' in repository '{}': {}", sanitizedBranchName, repoFullName, createResponse.getBody());
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY) {
                logger.warn("Branch '{}' may already exist in repository '{}' or name is invalid", branchName, repoFullName);
            } else if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                logger.error("Repository '{}' not found when creating branch '{}'", repoFullName, branchName);
            } else {
                logger.error("Failed to create branch '{}' in repository '{}': {}", branchName, repoFullName, e.getMessage());
            }
        } catch (Exception e) {
            logger.error("Unexpected error creating branch '{}' in repository '{}': {}", branchName, repoFullName, e.getMessage(), e);
        }
    }

    private HttpHeaders getHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    public boolean testGitHubToken(String githubToken) {
        try {
            String url = "https://api.github.com/user";
            HttpHeaders headers = getHeaders(githubToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode node = objectMapper.readTree(response.getBody());
                String login = node.get("login").asText();
                logger.info("GitHub token is valid for user: {}", login);
                
                // Check token scopes
                String scopes = response.getHeaders().getFirst("X-OAuth-Scopes");
                logger.info("GitHub token scopes: {}", scopes);
                
                if (scopes != null && scopes.contains("repo")) {
                    logger.info("GitHub token has repo scope - repository creation should work");
                    return true;
                } else {
                    logger.warn("GitHub token missing 'repo' scope. Current scopes: {}", scopes);
                    return false;
                }
            }
        } catch (Exception e) {
            logger.error("GitHub token validation failed: {}", e.getMessage());
        }
        return false;
    }
}
