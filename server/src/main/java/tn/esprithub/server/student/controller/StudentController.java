package tn.esprithub.server.student.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.esprithub.server.student.dto.StudentDashboardDto;
import tn.esprithub.server.student.dto.StudentTaskDto;
import tn.esprithub.server.student.dto.StudentGroupDto;
import tn.esprithub.server.student.dto.StudentProjectDto;
import tn.esprithub.server.student.service.StudentService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class StudentController {

    private final StudentService studentService;

    // Get student dashboard data
    @GetMapping("/dashboard")
    public ResponseEntity<StudentDashboardDto> getDashboard(Authentication authentication) {
        log.info("Fetching dashboard data for student: {}", authentication.getName());
        StudentDashboardDto dashboard = studentService.getStudentDashboard(authentication.getName());
        return ResponseEntity.ok(dashboard);
    }

    // Get student's tasks/assignments
    @GetMapping("/tasks")
    public ResponseEntity<Page<StudentTaskDto>> getTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        log.info("Fetching tasks for student: {} (page: {}, size: {}, status: {}, search: {})", 
                authentication.getName(), page, size, status, search);
        
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        Page<StudentTaskDto> tasks = studentService.getStudentTasks(authentication.getName(), pageable, status, search);
        return ResponseEntity.ok(tasks);
    }

    // Get specific task details
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<StudentTaskDto> getTaskDetails(
            @PathVariable UUID taskId,
            Authentication authentication) {
        log.info("Fetching task details for task: {} by student: {}", taskId, authentication.getName());
        StudentTaskDto task = studentService.getTaskDetails(taskId, authentication.getName());
        return ResponseEntity.ok(task);
    }

    // Submit task (mark as completed)
    @PostMapping("/tasks/{taskId}/submit")
    public ResponseEntity<Map<String, String>> submitTask(
            @PathVariable UUID taskId,
            @RequestBody(required = false) Map<String, String> submissionData,
            Authentication authentication) {
        log.info("Submitting task: {} by student: {}", taskId, authentication.getName());
        
        try {
            String notes = submissionData != null ? submissionData.get("notes") : "";
            studentService.submitTask(taskId, authentication.getName(), notes);
            return ResponseEntity.ok(Map.of("message", "Task submitted successfully"));
        } catch (Exception e) {
            log.error("Error submitting task: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to submit task: " + e.getMessage()));
        }
    }

    // Get student's groups
    @GetMapping("/groups")
    public ResponseEntity<List<StudentGroupDto>> getGroups(Authentication authentication) {
        log.info("Fetching groups for student: {}", authentication.getName());
        List<StudentGroupDto> groups = studentService.getStudentGroups(authentication.getName());
        return ResponseEntity.ok(groups);
    }

    // Get specific group details
    @GetMapping("/groups/{groupId}")
    public ResponseEntity<StudentGroupDto> getGroupDetails(
            @PathVariable UUID groupId,
            Authentication authentication) {
        log.info("Fetching group details for group: {} by student: {}", groupId, authentication.getName());
        StudentGroupDto group = studentService.getGroupDetails(groupId, authentication.getName());
        return ResponseEntity.ok(group);
    }

    // Get student's projects
    @GetMapping("/projects")
    public ResponseEntity<List<StudentProjectDto>> getProjects(Authentication authentication) {
        log.info("Fetching projects for student: {}", authentication.getName());
        List<StudentProjectDto> projects = studentService.getStudentProjects(authentication.getName());
        return ResponseEntity.ok(projects);
    }

    // Get specific project details
    @GetMapping("/projects/{projectId}")
    public ResponseEntity<StudentProjectDto> getProjectDetails(
            @PathVariable UUID projectId,
            Authentication authentication) {
        log.info("Fetching project details for project: {} by student: {}", projectId, authentication.getName());
        StudentProjectDto project = studentService.getProjectDetails(projectId, authentication.getName());
        return ResponseEntity.ok(project);
    }

    // Get student profile/class information
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(Authentication authentication) {
        log.info("Fetching profile for student: {}", authentication.getName());
        Map<String, Object> profile = studentService.getStudentProfile(authentication.getName());
        return ResponseEntity.ok(profile);
    }

    // Get notifications for student
    @GetMapping("/notifications")
    public ResponseEntity<List<Map<String, Object>>> getNotifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            Authentication authentication) {
        log.info("Fetching notifications for student: {} (unread only: {})", authentication.getName(), unreadOnly);
        List<Map<String, Object>> notifications = studentService.getNotifications(authentication.getName(), unreadOnly);
        return ResponseEntity.ok(notifications);
    }

    // Mark notification as read
    @PostMapping("/notifications/{notificationId}/read")
    public ResponseEntity<Map<String, String>> markNotificationAsRead(
            @PathVariable UUID notificationId,
            Authentication authentication) {
        log.info("Marking notification as read: {} by student: {}", notificationId, authentication.getName());
        
        try {
            studentService.markNotificationAsRead(notificationId, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
        } catch (Exception e) {
            log.error("Error marking notification as read: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to mark notification as read"));
        }
    }

    // Get student's upcoming deadlines
    @GetMapping("/deadlines")
    public ResponseEntity<List<Map<String, Object>>> getUpcomingDeadlines(
            @RequestParam(defaultValue = "7") int days,
            Authentication authentication) {
        log.info("Fetching upcoming deadlines for student: {} (next {} days)", authentication.getName(), days);
        List<Map<String, Object>> deadlines = studentService.getUpcomingDeadlines(authentication.getName(), days);
        return ResponseEntity.ok(deadlines);
    }

    // Get student's submission history
    @GetMapping("/submissions")
    public ResponseEntity<Page<Map<String, Object>>> getSubmissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        log.info("Fetching submissions for student: {} (page: {}, size: {})", authentication.getName(), page, size);
        
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        Page<Map<String, Object>> submissions = studentService.getSubmissions(authentication.getName(), pageable);
        return ResponseEntity.ok(submissions);
    }

    // Get student's repository access
    @GetMapping("/repositories")
    public ResponseEntity<List<Map<String, Object>>> getRepositories(Authentication authentication) {
        log.info("Fetching accessible repositories for student: {}", authentication.getName());
        List<Map<String, Object>> repositories = studentService.getAccessibleRepositories(authentication.getName());
        return ResponseEntity.ok(repositories);
    }

    // Get detailed repository information
    @GetMapping("/repositories/{repositoryId}/details")
    public ResponseEntity<Map<String, Object>> getRepositoryDetails(
            @PathVariable String repositoryId,
            Authentication authentication) {
        log.info("Fetching detailed repository information for repository: {} by student: {}", repositoryId, authentication.getName());
        Map<String, Object> repositoryDetails = studentService.getRepositoryDetails(repositoryId, authentication.getName());
        return ResponseEntity.ok(repositoryDetails);
    }

    // Get GitHub repository details
    @GetMapping("/repositories/{repositoryId}/github-details")
    public ResponseEntity<Map<String, Object>> getGitHubRepositoryDetails(
            @PathVariable String repositoryId,
            Authentication authentication) {
        log.info("Fetching GitHub repository details for repository: {} by student: {}", repositoryId, authentication.getName());
        
        try {
            Map<String, Object> githubDetails = studentService.getRepositoryDetails(repositoryId, authentication.getName());
            return ResponseEntity.ok(githubDetails);
        } catch (Exception e) {
            log.error("Error fetching GitHub repository details: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch GitHub repository details: " + e.getMessage()));
        }
    }

    // Get GitHub repository details by full name (owner/repo)
    @GetMapping("/github/{owner}/{repo}")
    public ResponseEntity<Map<String, Object>> getGitHubRepositoryByFullName(
            @PathVariable String owner,
            @PathVariable String repo,
            Authentication authentication) {
        log.info("Fetching GitHub repository details for {}/{} by student: {}", owner, repo, authentication.getName());
        
        try {
            Map<String, Object> githubDetails = studentService.getGitHubRepositoryByFullName(owner, repo, authentication.getName());
            return ResponseEntity.ok(githubDetails);
        } catch (Exception e) {
            log.error("Error fetching GitHub repository details: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch GitHub repository details: " + e.getMessage()));
        }
    }

    // Get repository files and folders
    @GetMapping("/github/{owner}/{repo}/files")
    public ResponseEntity<List<Map<String, Object>>> getRepositoryFiles(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestParam(value = "path", defaultValue = "") String path,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            Authentication authentication) {
        log.info("Fetching files for repository {}/{} at path: {} on branch: {} by student: {}", 
                owner, repo, path, branch, authentication.getName());
        
        try {
            List<Map<String, Object>> files = studentService.getRepositoryFiles(owner, repo, path, branch, authentication.getName());
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            log.error("Error fetching repository files: {}", e.getMessage());
            return ResponseEntity.badRequest().body(List.of(Map.of("error", "Failed to fetch repository files: " + e.getMessage())));
        }
    }

    // Get file content
    @GetMapping("/github/{owner}/{repo}/file-content")
    public ResponseEntity<Map<String, Object>> getFileContent(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestParam String path,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            Authentication authentication) {
        log.info("Fetching file content for {}/{} at path: {} on branch: {} by student: {}", 
                owner, repo, path, branch, authentication.getName());
        
        try {
            Map<String, Object> fileContent = studentService.getFileContent(owner, repo, path, branch, authentication.getName());
            return ResponseEntity.ok(fileContent);
        } catch (Exception e) {
            log.error("Error fetching file content: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to fetch file content: " + e.getMessage()));
        }
    }

    // Get repository commits with pagination
    @GetMapping("/github/{owner}/{repo}/commits")
    public ResponseEntity<List<Map<String, Object>>> getRepositoryCommits(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "per_page", defaultValue = "30") int perPage,
            Authentication authentication) {
        log.info("Fetching commits for repository {}/{} on branch: {} (page: {}, per_page: {}) by student: {}", 
                owner, repo, branch, page, perPage, authentication.getName());
        
        try {
            List<Map<String, Object>> commits = studentService.getRepositoryCommits(owner, repo, branch, page, perPage, authentication.getName());
            return ResponseEntity.ok(commits);
        } catch (Exception e) {
            log.error("Error fetching repository commits: {}", e.getMessage());
            return ResponseEntity.badRequest().body(List.of(Map.of("error", "Failed to fetch repository commits: " + e.getMessage())));
        }
    }

    // Get repository branches
    @GetMapping("/github/{owner}/{repo}/branches")
    public ResponseEntity<List<Map<String, Object>>> getRepositoryBranches(
            @PathVariable String owner,
            @PathVariable String repo,
            Authentication authentication) {
        log.info("Fetching branches for repository {}/{} by student: {}", owner, repo, authentication.getName());
        
        try {
            List<Map<String, Object>> branches = studentService.getRepositoryBranches(owner, repo, authentication.getName());
            return ResponseEntity.ok(branches);
        } catch (Exception e) {
            log.error("Error fetching repository branches: {}", e.getMessage());
            return ResponseEntity.badRequest().body(List.of(Map.of("error", "Failed to fetch repository branches: " + e.getMessage())));
        }
    }

    // Create a new file
    @PostMapping("/github/{owner}/{repo}/files")
    public ResponseEntity<Map<String, Object>> createFile(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestBody Map<String, Object> fileData,
            Authentication authentication) {
        log.info("Creating file in repository {}/{} by student: {}", owner, repo, authentication.getName());
        
        try {
            String path = (String) fileData.get("path");
            String content = (String) fileData.get("content");
            String message = (String) fileData.get("message");
            String branch = (String) fileData.getOrDefault("branch", "main");
            
            Map<String, Object> result = studentService.createFile(owner, repo, path, content, message, branch, authentication.getName());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creating file: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to create file: " + e.getMessage()));
        }
    }

    // Update an existing file
    @PutMapping("/github/{owner}/{repo}/files")
    public ResponseEntity<Map<String, Object>> updateFile(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestBody Map<String, Object> fileData,
            Authentication authentication) {
        log.info("Updating file in repository {}/{} by student: {}", owner, repo, authentication.getName());
        
        try {
            String path = (String) fileData.get("path");
            String content = (String) fileData.get("content");
            String message = (String) fileData.get("message");
            String sha = (String) fileData.get("sha"); // Required for updates
            String branch = (String) fileData.getOrDefault("branch", "main");
            
            Map<String, Object> result = studentService.updateFile(owner, repo, path, content, message, sha, branch, authentication.getName());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error updating file: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to update file: " + e.getMessage()));
        }
    }

    // Delete a file
    @DeleteMapping("/github/{owner}/{repo}/files")
    public ResponseEntity<Map<String, Object>> deleteFile(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestParam String path,
            @RequestParam String message,
            @RequestParam String sha,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            Authentication authentication) {
        log.info("Deleting file {} from repository {}/{} by student: {}", path, owner, repo, authentication.getName());
        
        try {
            Map<String, Object> result = studentService.deleteFile(owner, repo, path, message, sha, branch, authentication.getName());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error deleting file: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to delete file: " + e.getMessage()));
        }
    }

    // Create a new branch
    @PostMapping("/github/{owner}/{repo}/branches")
    public ResponseEntity<Map<String, Object>> createBranch(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestBody Map<String, Object> branchData,
            Authentication authentication) {
        log.info("Creating branch in repository {}/{} by student: {}", owner, repo, authentication.getName());
        
        try {
            String branchName = (String) branchData.get("name");
            String fromBranch = (String) branchData.getOrDefault("from", "main");
            
            Map<String, Object> result = studentService.createBranch(owner, repo, branchName, fromBranch, authentication.getName());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creating branch: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to create branch: " + e.getMessage()));
        }
    }

    // Get repository contributors
    @GetMapping("/github/{owner}/{repo}/contributors")
    public ResponseEntity<List<Map<String, Object>>> getRepositoryContributors(
            @PathVariable String owner,
            @PathVariable String repo,
            Authentication authentication) {
        log.info("Fetching contributors for repository {}/{} by student: {}", owner, repo, authentication.getName());
        
        try {
            List<Map<String, Object>> contributors = studentService.getRepositoryContributors(owner, repo, authentication.getName());
            return ResponseEntity.ok(contributors);
        } catch (Exception e) {
            log.error("Error fetching repository contributors: {}", e.getMessage());
            return ResponseEntity.badRequest().body(List.of(Map.of("error", "Failed to fetch repository contributors: " + e.getMessage())));
        }
    }

    // Get all GitHub repositories accessible to the student
    @GetMapping("/github-repositories")
    public ResponseEntity<List<Map<String, Object>>> getStudentGitHubRepositories(Authentication authentication) {
        log.info("Fetching all GitHub repositories for student: {}", authentication.getName());
        
        try {
            List<Map<String, Object>> repositories = studentService.getStudentGitHubRepositories(authentication.getName());
            return ResponseEntity.ok(repositories);
        } catch (Exception e) {
            log.error("Error fetching student GitHub repositories: {}", e.getMessage());
            return ResponseEntity.badRequest().body(List.of(Map.of("error", "Failed to fetch GitHub repositories: " + e.getMessage())));
        }
    }

    // Get student's weekly schedule
    @GetMapping("/schedule")
    public ResponseEntity<Map<String, Object>> getSchedule(Authentication authentication) {
        log.info("Fetching schedule for student: {}", authentication.getName());
        List<Map<String, Object>> weeklySchedule = studentService.getWeeklySchedule(authentication.getName());
        Map<String, Object> scheduleResponse = Map.of(
            "weeklySchedule", weeklySchedule,
            "upcomingEvents", studentService.getUpcomingDeadlines(authentication.getName(), 7),
            "deadlines", studentService.getUpcomingDeadlines(authentication.getName(), 14)
        );
        return ResponseEntity.ok(scheduleResponse);
    }

    // Debug endpoint: Test GitHub access and list actual repositories
    @GetMapping("/debug/github")
    public ResponseEntity<Map<String, Object>> debugGitHubAccess(Authentication authentication) {
        log.info("Debug: Testing GitHub access for student: {}", authentication.getName());
        
        try {
            Map<String, Object> debugInfo = studentService.debugGitHubAccess(authentication.getName());
            return ResponseEntity.ok(debugInfo);
        } catch (Exception e) {
            log.error("Error in GitHub debug: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "GitHub debug failed: " + e.getMessage()));
        }
    }
}