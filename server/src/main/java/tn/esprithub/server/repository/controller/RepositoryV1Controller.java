package tn.esprithub.server.repository.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprithub.server.admin.service.AdminUserDataService;
import tn.esprithub.server.common.exception.BusinessException;
import tn.esprithub.server.repository.entity.RepositoryCommit;
import tn.esprithub.server.repository.repository.RepositoryCommitRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"}, allowCredentials = "true")
public class RepositoryV1Controller {

    private final AdminUserDataService adminUserDataService;
    private final RepositoryCommitRepository commitRepository;

    /**
     * Get repository details by ID
     */
    @GetMapping("/{repositoryId}")
    public ResponseEntity<Map<String, Object>> getRepositoryDetails(@PathVariable UUID repositoryId) {
        log.info("🔍 [V1] Getting repository details for: {}", repositoryId);
        
        try {
            Map<String, Object> repositoryDetails = adminUserDataService.getRepositoryDetails(repositoryId);
            
            if (repositoryDetails.isEmpty()) {
                log.warn("❌ Repository not found: {}", repositoryId);
                return ResponseEntity.notFound().build();
            }
            
            log.info("✅ Successfully retrieved repository details for: {}", repositoryId);
            return ResponseEntity.ok(repositoryDetails);
            
        } catch (Exception e) {
            log.error("❌ Error getting repository details: {}", repositoryId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to get repository details",
                "message", e.getMessage(),
                "repositoryId", repositoryId.toString()
            ));
        }
    }

    /**
     * Get paginated commits for a repository
     */
    @GetMapping("/{repositoryId}/commits")
    public ResponseEntity<Map<String, Object>> getRepositoryCommits(
            @PathVariable UUID repositoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("🔍 [V1] Getting commits for repository: {} (page: {}, size: {})", repositoryId, page, size);
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<RepositoryCommit> commitsPage = commitRepository.findByRepositoryIdOrderByDateDesc(repositoryId, pageable);
            
            List<Map<String, Object>> commits = commitsPage.getContent().stream()
                .map(this::mapCommitToData)
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("commits", commits);
            response.put("page", page);
            response.put("size", size);
            response.put("totalElements", commitsPage.getTotalElements());
            response.put("totalPages", commitsPage.getTotalPages());
            response.put("hasNext", commitsPage.hasNext());
            response.put("hasPrevious", commitsPage.hasPrevious());
            response.put("repositoryId", repositoryId);
            
            log.info("✅ Returning {} commits for repository: {}", commits.size(), repositoryId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Error getting commits for repository: {}", repositoryId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to get repository commits",
                "message", e.getMessage(),
                "repositoryId", repositoryId.toString()
            ));
        }
    }

    /**
     * Get repository files
     */
    @GetMapping("/{repositoryId}/files")
    public ResponseEntity<List<Map<String, Object>>> getRepositoryFiles(
            @PathVariable UUID repositoryId,
            @RequestParam(required = false) String branch) {
        log.info("🔍 [V1] Getting files for repository: {} (branch: {})", repositoryId, branch);
        
        try {
            List<Map<String, Object>> files = adminUserDataService.getRepositoryFiles(repositoryId, branch);
            
            log.info("✅ Returning {} files for repository: {}", files.size(), repositoryId);
            return ResponseEntity.ok(files);
            
        } catch (Exception e) {
            log.error("❌ Error getting files for repository: {}", repositoryId, e);
            return ResponseEntity.internalServerError().body(List.of(Map.of(
                "error", "Failed to get repository files",
                "message", e.getMessage(),
                "repositoryId", repositoryId.toString()
            )));
        }
    }

    /**
     * Get specific file content
     */
    @GetMapping("/files/{fileId}/content")
    public ResponseEntity<Map<String, Object>> getFileContent(@PathVariable UUID fileId) {
        log.info("🔍 [V1] Getting file content for: {}", fileId);
        
        try {
            Map<String, Object> fileContent = adminUserDataService.getFileContent(fileId);
            
            if (fileContent.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(fileContent);
            
        } catch (Exception e) {
            log.error("❌ Error getting file content: {}", fileId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to get file content",
                "message", e.getMessage(),
                "fileId", fileId.toString()
            ));
        }
    }

    /**
     * Get commit details
     */
    @GetMapping("/commits/{commitId}")
    public ResponseEntity<Map<String, Object>> getCommitDetails(@PathVariable UUID commitId) {
        log.info("🔍 [V1] Getting commit details for: {}", commitId);
        
        try {
            Map<String, Object> commitDetails = adminUserDataService.getCommitDetails(commitId);
            
            if (commitDetails.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(commitDetails);
            
        } catch (Exception e) {
            log.error("❌ Error getting commit details: {}", commitId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to get commit details",
                "message", e.getMessage(),
                "commitId", commitId.toString()
            ));
        }
    }

    /**
     * Health check
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "controller", "RepositoryV1Controller",
            "timestamp", java.time.LocalDateTime.now().toString(),
            "version", "v1"
        ));
    }

    /**
     * Map commit entity to response data
     */
    private Map<String, Object> mapCommitToData(RepositoryCommit commit) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", commit.getId());
        data.put("sha", commit.getSha());
        data.put("message", commit.getMessage());
        data.put("authorName", commit.getAuthorName());
        data.put("authorEmail", commit.getAuthorEmail());
        data.put("authorDate", commit.getAuthorDate());
        data.put("committerName", commit.getCommitterName());
        data.put("committerEmail", commit.getCommitterEmail());
        data.put("committerDate", commit.getCommitterDate());
        data.put("additions", commit.getAdditions());
        data.put("deletions", commit.getDeletions());
        data.put("filesChanged", commit.getFilesChanged());
        return data;
    }
}
