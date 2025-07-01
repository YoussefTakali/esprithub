package tn.esprithub.server.repository.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprithub.server.repository.dto.RepositoryDto;
import tn.esprithub.server.repository.dto.RepositoryStatsDto;
import tn.esprithub.server.repository.dto.FileUploadDto;
import tn.esprithub.server.repository.service.RepositoryService;

import java.util.List;

@RestController
@RequestMapping("/api/repositories")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:4200")
public class RepositoryController {

    private final RepositoryService repositoryService;

    @GetMapping("/teacher")
    public ResponseEntity<List<RepositoryDto>> getTeacherRepositories(Authentication authentication) {
        log.info("Fetching repositories for teacher: {}", authentication.getName());
        List<RepositoryDto> repositories = repositoryService.getTeacherRepositories(authentication.getName());
        return ResponseEntity.ok(repositories);
    }

    @GetMapping("/{repoFullName}/stats")
    public ResponseEntity<RepositoryStatsDto> getRepositoryStats(
            @PathVariable String repoFullName,
            Authentication authentication) {
        log.info("Fetching stats for repository: {} by teacher: {}", repoFullName, authentication.getName());
        RepositoryStatsDto stats = repositoryService.getRepositoryStats(repoFullName, authentication.getName());
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/{repoFullName}/upload")
    public ResponseEntity<String> uploadFile(
            @PathVariable String repoFullName,
            @RequestParam("file") MultipartFile file,
            @RequestParam("path") String path,
            @RequestParam("message") String commitMessage,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            Authentication authentication) {
        log.info("Uploading file to repository: {} by teacher: {}", repoFullName, authentication.getName());
        
        FileUploadDto uploadDto = FileUploadDto.builder()
                .file(file)
                .path(path)
                .commitMessage(commitMessage)
                .branch(branch)
                .build();
                
        String commitSha = repositoryService.uploadFile(repoFullName, uploadDto, authentication.getName());
        return ResponseEntity.ok(commitSha);
    }

    @GetMapping("/{repoFullName}/files")
    public ResponseEntity<List<String>> getRepositoryFiles(
            @PathVariable String repoFullName,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            Authentication authentication) {
        log.info("Fetching files for repository: {} branch: {} by teacher: {}", repoFullName, branch, authentication.getName());
        List<String> files = repositoryService.getRepositoryFiles(repoFullName, branch, authentication.getName());
        return ResponseEntity.ok(files);
    }

    @GetMapping("/{repoFullName}/branches")
    public ResponseEntity<List<String>> getRepositoryBranches(
            @PathVariable String repoFullName,
            Authentication authentication) {
        log.info("Fetching branches for repository: {} by teacher: {}", repoFullName, authentication.getName());
        List<String> branches = repositoryService.getRepositoryBranches(repoFullName, authentication.getName());
        return ResponseEntity.ok(branches);
    }

    @DeleteMapping("/{repoFullName}/files/{filePath}")
    public ResponseEntity<String> deleteFile(
            @PathVariable String repoFullName,
            @PathVariable String filePath,
            @RequestParam("message") String commitMessage,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            Authentication authentication) {
        log.info("Deleting file {} from repository: {} by teacher: {}", filePath, repoFullName, authentication.getName());
        String commitSha = repositoryService.deleteFile(repoFullName, filePath, commitMessage, branch, authentication.getName());
        return ResponseEntity.ok(commitSha);
    }
}
