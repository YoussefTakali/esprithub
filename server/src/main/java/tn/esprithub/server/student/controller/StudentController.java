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
}
