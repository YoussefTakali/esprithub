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
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepositoryServiceImpl implements RepositoryService {

    private static final String GITHUB_API_BASE = "https://api.github.com";
    private final UserRepository userRepository;
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
                    RepositoryStatsDto.CommitDto commitDto = RepositoryStatsDto.CommitDto.builder()
                            .sha(commit.get("sha").asText())
                            .message(commit.get("commit").get("message").asText())
                            .author(commit.get("commit").get("author").get("name").asText())
                            .date(parseGitHubDate(commit.get("commit").get("author").get("date").asText()))
                            .url(commit.get("html_url").asText())
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
}
