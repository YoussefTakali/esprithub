package tn.esprithub.server.integration.github;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

@Service
public class GithubService {


    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String createRepositoryForUser(String repoName, String githubToken) {
        String url = "https://api.github.com/user/repos";
        Map<String, Object> body = new HashMap<>();
        body.put("name", repoName);
        body.put("private", true);
        HttpHeaders headers = getHeaders(githubToken);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful()) {
            try {
                JsonNode node = objectMapper.readTree(response.getBody());
                return node.get("full_name").asText();
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse GitHub response", e);
            }
        }
        throw new RuntimeException("Failed to create repo: " + response.getBody());
    }

    public void inviteUserToRepo(String repoFullName, String githubUsername, String githubToken) {
        String url = "https://api.github.com/repos/" + repoFullName + "/collaborators/" + githubUsername;
        HttpHeaders headers = getHeaders(githubToken);
        Map<String, Object> body = new HashMap<>();
        body.put("permission", "push");
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        restTemplate.put(url, entity);
    }

    public void createBranch(String repoFullName, String branchName, String githubToken) {
        // Get default branch SHA
        String repoUrl = "https://api.github.com/repos/" + repoFullName;
        HttpHeaders headers = getHeaders(githubToken);
        ResponseEntity<String> repoResp = restTemplate.exchange(repoUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        String defaultBranch;
        try {
            JsonNode node = objectMapper.readTree(repoResp.getBody());
            defaultBranch = node.get("default_branch").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get default branch", e);
        }
        // Get SHA of default branch
        String branchUrl = repoUrl + "/git/refs/heads/" + defaultBranch;
        ResponseEntity<String> branchResp = restTemplate.exchange(branchUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        String sha;
        try {
            JsonNode node = objectMapper.readTree(branchResp.getBody());
            sha = node.get("object").get("sha").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get branch SHA", e);
        }
        // Create new branch
        String createRefUrl = repoUrl + "/git/refs";
        Map<String, Object> refBody = new HashMap<>();
        refBody.put("ref", "refs/heads/" + branchName);
        refBody.put("sha", sha);
        HttpEntity<Map<String, Object>> refEntity = new HttpEntity<>(refBody, headers);
        restTemplate.postForEntity(createRefUrl, refEntity, String.class);
    }

    private HttpHeaders getHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }
}
