package tn.esprithub.server.repository.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tn.esprithub.server.common.exception.BusinessException;
import tn.esprithub.server.integration.github.GithubService;
import tn.esprithub.server.repository.dto.FileUploadDto;
import tn.esprithub.server.repository.dto.RepositoryDto;
import tn.esprithub.server.repository.dto.RepositoryStatsDto;
import tn.esprithub.server.repository.service.RepositoryService;
import tn.esprithub.server.repository.repository.RepositoryEntityRepository;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepositoryServiceImpl implements RepositoryService {

    private static final String GITHUB_API_BASE = "https://api.github.com";
    private static final String REPOS_PATH = "/repos/";
    private static final String PERMISSIONS_KEY = "permissions";
    private final UserRepository userRepository;
    private final RepositoryEntityRepository repositoryEntityRepository;
    private final GithubService githubService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<RepositoryDto> getTeacherRepositories(String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            // Get repositories from GitHub API
            String url = GITHUB_API_BASE + "/user/repos?per_page=100";
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode repos = objectMapper.readTree(response.getBody());
                List<RepositoryDto> repositories = new ArrayList<>();
                
                for (JsonNode repo : repos) {
                    RepositoryDto dto = mapToRepositoryDto(repo, teacher.getGithubToken());
                    repositories.add(dto);
                }
                
                log.info("Found {} repositories for teacher: {}", repositories.size(), teacherEmail);
                return repositories;
            } else {
                throw new BusinessException("Failed to fetch repositories from GitHub");
            }
        } catch (Exception e) {
            log.error("Error fetching repositories for teacher {}: {}", teacherEmail, e.getMessage());
            throw new BusinessException("Failed to fetch repositories: " + e.getMessage());
        }
    }

    @Override
    public RepositoryStatsDto getRepositoryStats(String repoFullName, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String repoUrl = GITHUB_API_BASE + "/repos/" + repoFullName;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            // Get basic repository info
            ResponseEntity<String> repoResponse = restTemplate.exchange(repoUrl, HttpMethod.GET, entity, String.class);
            JsonNode repoData = objectMapper.readTree(repoResponse.getBody());
            
            // Get commits
            List<RepositoryStatsDto.CommitDto> recentCommits = getRecentCommits(repoFullName, headers);
            
            // Get branches
            List<RepositoryStatsDto.BranchActivityDto> branchActivity = getBranchActivity(repoFullName, headers);
            
            // Get language stats
            Map<String, Integer> languageStats = getLanguageStats(repoFullName, headers);
            
            // Get collaborators count
            int collaboratorCount = getCollaboratorCount(repoFullName, headers);
            
            RepositoryStatsDto stats = RepositoryStatsDto.builder()
                    .repositoryName(repoData.get("name").asText())
                    .fullName(repoData.get("full_name").asText())
                    .totalCommits(recentCommits.size())
                    .totalBranches(branchActivity.size())
                    .totalCollaborators(collaboratorCount)
                    .totalSize(repoData.get("size").asLong())
                    .lastActivity(parseGitHubDate(repoData.get("updated_at").asText()))
                    .languageStats(languageStats)
                    .recentCommits(recentCommits)
                    .branchActivity(branchActivity)
                    .openIssues(repoData.get("open_issues_count").asInt())
                    .build();
                    
            log.info("Generated stats for repository: {}", repoFullName);
            return stats;
            
        } catch (Exception e) {
            log.error("Error fetching repository stats for {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to fetch repository stats: " + e.getMessage());
        }
    }

    @Override
    public String uploadFile(String repoFullName, FileUploadDto uploadDto, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            // Convert file to base64
            byte[] fileContent = uploadDto.getFile().getBytes();
            String encodedContent = Base64.getEncoder().encodeToString(fileContent);
            
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/contents/" + uploadDto.getPath();
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("message", uploadDto.getCommitMessage());
            requestBody.put("content", encodedContent);
            requestBody.put("branch", uploadDto.getBranch());
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode responseData = objectMapper.readTree(response.getBody());
                String commitSha = responseData.get("commit").get("sha").asText();
                log.info("Successfully uploaded file {} to repository {}", uploadDto.getPath(), repoFullName);
                return commitSha;
            } else {
                throw new BusinessException("Failed to upload file to GitHub");
            }
            
        } catch (Exception e) {
            log.error("Error uploading file to repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    @Override
    public List<String> getRepositoryFiles(String repoFullName, String branch, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/contents?ref=" + branch;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode files = objectMapper.readTree(response.getBody());
                List<String> fileList = new ArrayList<>();
                
                for (JsonNode file : files) {
                    String fileName = file.get("name").asText();
                    String type = file.get("type").asText();
                    fileList.add(fileName + " (" + type + ")");
                }
                
                return fileList;
            } else {
                throw new BusinessException("Failed to fetch repository files");
            }
            
        } catch (Exception e) {
            log.error("Error fetching files for repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to fetch repository files: " + e.getMessage());
        }
    }

    @Override
    public List<String> getRepositoryBranches(String repoFullName, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/branches";
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode branches = objectMapper.readTree(response.getBody());
                List<String> branchList = new ArrayList<>();
                
                for (JsonNode branch : branches) {
                    branchList.add(branch.get("name").asText());
                }
                
                return branchList;
            } else {
                throw new BusinessException("Failed to fetch repository branches");
            }
            
        } catch (Exception e) {
            log.error("Error fetching branches for repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to fetch repository branches: " + e.getMessage());
        }
    }

    @Override
    public String deleteFile(String repoFullName, String filePath, String commitMessage, String branch, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            // First get the file SHA
            String getUrl = GITHUB_API_BASE + "/repos/" + repoFullName + "/contents/" + filePath + "?ref=" + branch;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> getEntity = new HttpEntity<>(headers);
            
            ResponseEntity<String> getResponse = restTemplate.exchange(getUrl, HttpMethod.GET, getEntity, String.class);
            JsonNode fileData = objectMapper.readTree(getResponse.getBody());
            String fileSha = fileData.get("sha").asText();
            
            // Delete the file
            String deleteUrl = GITHUB_API_BASE + "/repos/" + repoFullName + "/contents/" + filePath;
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("message", commitMessage);
            requestBody.put("sha", fileSha);
            requestBody.put("branch", branch);
            
            HttpEntity<Map<String, Object>> deleteEntity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> deleteResponse = restTemplate.exchange(deleteUrl, HttpMethod.DELETE, deleteEntity, String.class);
            
            if (deleteResponse.getStatusCode().is2xxSuccessful()) {
                JsonNode responseData = objectMapper.readTree(deleteResponse.getBody());
                String commitSha = responseData.get("commit").get("sha").asText();
                log.info("Successfully deleted file {} from repository {}", filePath, repoFullName);
                return commitSha;
            } else {
                throw new BusinessException("Failed to delete file from GitHub");
            }
            
        } catch (Exception e) {
            log.error("Error deleting file from repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to delete file: " + e.getMessage());
        }
    }

    private User getTeacherWithGitHubToken(String teacherEmail) {
        User teacher = userRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new BusinessException("Teacher not found"));
                
        if (teacher.getGithubToken() == null || teacher.getGithubToken().isBlank()) {
            throw new BusinessException("Teacher must have GitHub token configured");
        }
        
        return teacher;
    }

    private HttpHeaders createHeaders(String githubToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(githubToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    private RepositoryDto mapToRepositoryDto(JsonNode repo, String githubToken) {
        try {
            return RepositoryDto.builder()
                    .name(repo.get("name").asText())
                    .fullName(repo.get("full_name").asText())
                    .description(repo.has("description") && !repo.get("description").isNull() ? repo.get("description").asText() : "")
                    .url(repo.get("html_url").asText())
                    .isPrivate(repo.get("private").asBoolean())
                    .createdAt(parseGitHubDate(repo.get("created_at").asText()))
                    .updatedAt(parseGitHubDate(repo.get("updated_at").asText()))
                    .defaultBranch(repo.get("default_branch").asText())
                    .starCount(repo.get("stargazers_count").asInt())
                    .forkCount(repo.get("forks_count").asInt())
                    .language(repo.has("language") && !repo.get("language").isNull() ? repo.get("language").asText() : "")
                    .size(repo.get("size").asLong())
                    .cloneUrl(repo.get("clone_url").asText())
                    .sshUrl(repo.get("ssh_url").asText())
                    .hasIssues(repo.get("has_issues").asBoolean())
                    .hasWiki(repo.get("has_wiki").asBoolean())
                    .build();
        } catch (Exception e) {
            log.warn("Error mapping repository data: {}", e.getMessage());
            return RepositoryDto.builder()
                    .name(repo.get("name").asText())
                    .fullName(repo.get("full_name").asText())
                    .url(repo.get("html_url").asText())
                    .build();
        }
    }

    private LocalDateTime parseGitHubDate(String dateString) {
        try {
            return ZonedDateTime.parse(dateString).toLocalDateTime();
        } catch (Exception e) {
            log.warn("Failed to parse GitHub date: {}", dateString);
            return LocalDateTime.now();
        }
    }

    private List<RepositoryStatsDto.CommitDto> getRecentCommits(String repoFullName, HttpHeaders headers) {
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/commits?per_page=10";
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode commits = objectMapper.readTree(response.getBody());
                List<RepositoryStatsDto.CommitDto> commitList = new ArrayList<>();
                
                for (JsonNode commit : commits) {
                    // Get avatar URL from the GitHub user info (author field in the commit object)
                    String avatarUrl = null;
                    if (commit.has("author") && commit.get("author") != null && !commit.get("author").isNull()) {
                        avatarUrl = commit.get("author").get("avatar_url").asText();
                    }

                    RepositoryStatsDto.CommitDto commitDto = RepositoryStatsDto.CommitDto.builder()
                            .sha(commit.get("sha").asText())
                            .message(commit.get("commit").get("message").asText())
                            .author(commit.get("commit").get("author").get("name").asText())
                            .date(parseGitHubDate(commit.get("commit").get("author").get("date").asText()))
                            .url(commit.get("html_url").asText())
                            .avatarUrl(avatarUrl)
                            .build();
                    commitList.add(commitDto);
                }
                
                return commitList;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch recent commits: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<RepositoryStatsDto.BranchActivityDto> getBranchActivity(String repoFullName, HttpHeaders headers) {
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/branches";
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode branches = objectMapper.readTree(response.getBody());
                List<RepositoryStatsDto.BranchActivityDto> branchList = new ArrayList<>();
                
                for (JsonNode branch : branches) {
                    RepositoryStatsDto.BranchActivityDto branchDto = RepositoryStatsDto.BranchActivityDto.builder()
                            .branchName(branch.get("name").asText())
                            .isProtected(branch.get("protected").asBoolean())
                            .build();
                    branchList.add(branchDto);
                }
                
                return branchList;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch branch activity: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private Map<String, Integer> getLanguageStats(String repoFullName, HttpHeaders headers) {
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/languages";
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode languages = objectMapper.readTree(response.getBody());
                Map<String, Integer> languageMap = new HashMap<>();
                
                languages.fieldNames().forEachRemaining(language -> {
                    languageMap.put(language, languages.get(language).asInt());
                });
                
                return languageMap;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch language stats: {}", e.getMessage());
        }
        return Collections.emptyMap();
    }

    private int getCollaboratorCount(String repoFullName, HttpHeaders headers) {
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/collaborators";
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode collaborators = objectMapper.readTree(response.getBody());
                return collaborators.size();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch collaborator count: {}", e.getMessage());
        }
        return 0;
    }
    
    @Override
    public void createBranch(String repoFullName, String branchName, String fromBranch, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            // First, get the SHA of the source branch
            String getBranchUrl = GITHUB_API_BASE + "/repos/" + repoFullName + "/git/ref/heads/" + fromBranch;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> getEntity = new HttpEntity<>(headers);
            
            ResponseEntity<String> getBranchResponse = restTemplate.exchange(getBranchUrl, HttpMethod.GET, getEntity, String.class);
            JsonNode branchData = objectMapper.readTree(getBranchResponse.getBody());
            String sha = branchData.get("object").get("sha").asText();
            
            // Create the new branch
            String createBranchUrl = GITHUB_API_BASE + "/repos/" + repoFullName + "/git/refs";
            Map<String, Object> createBranchData = Map.of(
                "ref", "refs/heads/" + branchName,
                "sha", sha
            );
            
            HttpEntity<Map<String, Object>> createEntity = new HttpEntity<>(createBranchData, headers);
            ResponseEntity<String> createResponse = restTemplate.exchange(createBranchUrl, HttpMethod.POST, createEntity, String.class);
            
            if (!createResponse.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("Failed to create branch on GitHub");
            }
            
            log.info("Successfully created branch {} from {} in repository {}", branchName, fromBranch, repoFullName);
            
        } catch (Exception e) {
            log.error("Error creating branch {} in repository {}: {}", branchName, repoFullName, e.getMessage());
            throw new BusinessException("Failed to create branch: " + e.getMessage());
        }
    }
    
    @Override
    public void deleteBranch(String repoFullName, String branchName, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/git/refs/heads/" + branchName;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("Failed to delete branch on GitHub");
            }
            
            log.info("Successfully deleted branch {} from repository {}", branchName, repoFullName);
            
        } catch (Exception e) {
            log.error("Error deleting branch {} from repository {}: {}", branchName, repoFullName, e.getMessage());
            throw new BusinessException("Failed to delete branch: " + e.getMessage());
        }
    }
    
    @Override
    public List<Map<String, Object>> getCollaborators(String repoFullName, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        try {
            String collabUrl = GITHUB_API_BASE + "/repos/" + repoFullName + "/collaborators";
            String invitesUrl = GITHUB_API_BASE + "/repos/" + repoFullName + "/invitations";
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // Fetch accepted collaborators
            ResponseEntity<String> collabResponse = restTemplate.exchange(collabUrl, HttpMethod.GET, entity, String.class);
            List<Map<String, Object>> collaboratorList = new ArrayList<>();
            if (collabResponse.getStatusCode().is2xxSuccessful()) {
                JsonNode collaborators = objectMapper.readTree(collabResponse.getBody());
                for (JsonNode collaborator : collaborators) {
                    Map<String, Object> collabData = Map.of(
                        "username", collaborator.get("login").asText(),
                        "avatar_url", collaborator.get("avatar_url").asText(),
                        "type", collaborator.get("type").asText(),
                        "permissions", collaborator.has("permissions") ? collaborator.get("permissions") : Map.of(),
                        "pending", false
                    );
                    collaboratorList.add(collabData);
                }
            }

            // Fetch pending invitations
            ResponseEntity<String> inviteResponse = restTemplate.exchange(invitesUrl, HttpMethod.GET, entity, String.class);
            if (inviteResponse.getStatusCode().is2xxSuccessful()) {
                JsonNode invitations = objectMapper.readTree(inviteResponse.getBody());
                for (JsonNode invite : invitations) {
                    String username = invite.has("invitee") && invite.get("invitee").has("login") ? invite.get("invitee").get("login").asText() : null;
                    String avatarUrl = invite.has("invitee") && invite.get("invitee").has("avatar_url") ? invite.get("invitee").get("avatar_url").asText() : null;
                    String email = invite.has("email") ? invite.get("email").asText() : null;
                    Map<String, Object> pendingData = new HashMap<>();
                    pendingData.put("pending", true);
                    pendingData.put("type", "User");
                    if (username != null) pendingData.put("username", username);
                    if (avatarUrl != null) pendingData.put("avatar_url", avatarUrl);
                    if (email != null) pendingData.put("email", email);
                    collaboratorList.add(pendingData);
                }
            }
            return collaboratorList;
        } catch (Exception e) {
            log.error("Error fetching collaborators for repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to fetch collaborators: " + e.getMessage());
        }
    }
    
    @Override
    public void addCollaborator(String repoFullName, String username, String permission, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/collaborators/" + username;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            Map<String, Object> requestData = Map.of("permission", permission);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestData, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("Failed to add collaborator on GitHub");
            }
            
            log.info("Successfully added collaborator {} to repository {}", username, repoFullName);
            
        } catch (Exception e) {
            log.error("Error adding collaborator {} to repository {}: {}", username, repoFullName, e.getMessage());
            throw new BusinessException("Failed to add collaborator: " + e.getMessage());
        }
    }
    
    @Override
    public void removeCollaborator(String repoFullName, String username, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/collaborators/" + username;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("Failed to remove collaborator from GitHub");
            }
            
            log.info("Successfully removed collaborator {} from repository {}", username, repoFullName);
            
        } catch (Exception e) {
            log.error("Error removing collaborator {} from repository {}: {}", username, repoFullName, e.getMessage());
            throw new BusinessException("Failed to remove collaborator: " + e.getMessage());
        }
    }
    
    @Override
    public void updateRepository(String repoFullName, Map<String, Object> settings, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(settings, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.PATCH, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("Failed to update repository on GitHub");
            }
            
            log.info("Successfully updated repository {} settings", repoFullName);
            
        } catch (Exception e) {
            log.error("Error updating repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to update repository: " + e.getMessage());
        }
    }
    
    @Override
    public void deleteRepository(String repoFullName, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            // First, delete from GitHub
            String url = GITHUB_API_BASE + "/repos/" + repoFullName;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new BusinessException("Failed to delete repository on GitHub");
            }
            
            // Then, remove from local database if it exists
            Optional<tn.esprithub.server.repository.entity.Repository> existingRepo = 
                repositoryEntityRepository.findByFullName(repoFullName);
            
            if (existingRepo.isPresent()) {
                repositoryEntityRepository.delete(existingRepo.get());
                log.info("Successfully deleted repository {} from database", repoFullName);
            } else {
                log.info("Repository {} was not found in local database, only deleted from GitHub", repoFullName);
            }
            
            log.info("Successfully deleted repository {}", repoFullName);
            
        } catch (Exception e) {
            log.error("Error deleting repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to delete repository: " + e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> getCommits(String repoFullName, String branch, int page, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            String url = GITHUB_API_BASE + "/repos/" + repoFullName + "/commits?sha=" + branch + "&per_page=30&page=" + page;
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode commits = objectMapper.readTree(response.getBody());
                List<Map<String, Object>> commitList = new ArrayList<>();
                
                for (JsonNode commit : commits) {
                    // Get avatar URL from the GitHub user info
                    String avatarUrl = null;
                    if (commit.has("author") && commit.get("author") != null && !commit.get("author").isNull()) {
                        avatarUrl = commit.get("author").get("avatar_url").asText();
                    }

                    Map<String, Object> commitData = new HashMap<>();
                    commitData.put("sha", commit.get("sha").asText());
                    commitData.put("message", commit.get("commit").get("message").asText());
                    commitData.put("author", commit.get("commit").get("author").get("name").asText());
                    commitData.put("date", commit.get("commit").get("author").get("date").asText());
                    commitData.put("url", commit.get("html_url").asText());
                    if (avatarUrl != null) {
                        commitData.put("avatarUrl", avatarUrl);
                    }

                    commitList.add(commitData);
                }
                
                return commitList;
            } else {
                throw new BusinessException("Failed to fetch commits from GitHub");
            }
            
        } catch (Exception e) {
            log.error("Error fetching commits for repository {}: {}", repoFullName, e.getMessage());
            throw new BusinessException("Failed to fetch commits: " + e.getMessage());
        }
    }

    @Override
    public Object getLatestCommit(String owner, String repo, String path, String branch, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);

        try {
            // Build the URL properly with encoding
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromHttpUrl("https://api.github.com/repos/" + owner + "/" + repo + "/commits")
                    .queryParam("sha", branch)
                    .queryParam("per_page", 1);

            // Only add path parameter if it's not empty
            if (path != null && !path.trim().isEmpty()) {
                builder.queryParam("path", path);
            }

            String url = builder.build().encode().toUriString();

            // Log the URL for debugging
            System.out.println("Latest commit URL: " + url);

            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode result = objectMapper.readTree(response.getBody());
                System.out.println("Latest commit response: " + result.toString());
                return result;
            } else {
                throw new BusinessException("Failed to fetch latest commit from GitHub");
            }

        } catch (Exception e) {
            log.error("Error fetching latest commit for path {} in repository {}/{}: {}", path, owner, repo, e.getMessage());
            throw new BusinessException("Error fetching commit: " + e.getMessage() +
                    " for path: " + path + " in repo: " + owner + "/" + repo + ", branch: " + branch);
        }
    }

    @Override
    public RepositoryDto createRepository(String repositoryName, String description, boolean isPrivate, String teacherEmail) {
        User teacher = getTeacherWithGitHubToken(teacherEmail);
        
        try {
            // Create repository payload
            Map<String, Object> repoPayload = new HashMap<>();
            repoPayload.put("name", repositoryName);
            repoPayload.put("description", description != null ? description : "");
            repoPayload.put("private", isPrivate);
            repoPayload.put("auto_init", true); // Initialize with README
            repoPayload.put("has_issues", true);
            repoPayload.put("has_wiki", true);
            repoPayload.put("has_downloads", true);
            
            String url = GITHUB_API_BASE + "/user/repos";
            HttpHeaders headers = createHeaders(teacher.getGithubToken());
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(repoPayload, headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode repoNode = objectMapper.readTree(response.getBody());
                
                // Save repository to database
                tn.esprithub.server.repository.entity.Repository repoEntity = new tn.esprithub.server.repository.entity.Repository();
                repoEntity.setName(repositoryName);
                repoEntity.setFullName(repoNode.get("full_name").asText());
                repoEntity.setDescription(description);
                repoEntity.setUrl(repoNode.get("html_url").asText());
                repoEntity.setIsPrivate(isPrivate);
                repoEntity.setDefaultBranch(repoNode.get("default_branch").asText());
                repoEntity.setCloneUrl(repoNode.get("clone_url").asText());
                repoEntity.setSshUrl(repoNode.get("ssh_url").asText());
                repoEntity.setOwner(teacher);
                
                repositoryEntityRepository.save(repoEntity);
                
                // Convert to DTO and return
                return RepositoryDto.builder()
                    .name(repositoryName)
                    .fullName(repoNode.get("full_name").asText())
                    .description(description)
                    .url(repoNode.get("html_url").asText())
                    .isPrivate(isPrivate)
                    .createdAt(parseGitHubDate(repoNode.get("created_at").asText()))
                    .updatedAt(parseGitHubDate(repoNode.get("updated_at").asText()))
                    .defaultBranch(repoNode.get("default_branch").asText())
                    .starCount(repoNode.get("stargazers_count").asInt())
                    .forkCount(repoNode.get("forks_count").asInt())
                    .language(repoNode.has("language") && !repoNode.get("language").isNull() ? 
                        repoNode.get("language").asText() : "")
                    .size(repoNode.get("size").asLong())
                    .collaborators(new ArrayList<>())
                    .branches(List.of(repoNode.get("default_branch").asText()))
                    .hasIssues(repoNode.get("has_issues").asBoolean())
                    .hasWiki(repoNode.get("has_wiki").asBoolean())
                    .cloneUrl(repoNode.get("clone_url").asText())
                    .sshUrl(repoNode.get("ssh_url").asText())
                    .build();
                
            } else {
                throw new BusinessException("Failed to create repository on GitHub");
            }
            
        } catch (Exception e) {
            log.error("Error creating repository {}: {}", repositoryName, e.getMessage());
            throw new BusinessException("Failed to create repository: " + e.getMessage());
        }
    }
}
