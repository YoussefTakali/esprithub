package tn.esprithub.server.student.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import tn.esprithub.server.student.dto.StudentDashboardDto;
import tn.esprithub.server.student.dto.StudentTaskDto;
import tn.esprithub.server.student.dto.StudentGroupDto;
import tn.esprithub.server.student.dto.StudentProjectDto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface StudentService {
    
    /**
     * Get comprehensive dashboard data for student
     */
    StudentDashboardDto getStudentDashboard(String studentEmail);
    
    /**
     * Get paginated list of tasks assigned to student
     */
    Page<StudentTaskDto> getStudentTasks(String studentEmail, Pageable pageable, String status, String search);
    
    /**
     * Get detailed information about a specific task
     */
    StudentTaskDto getTaskDetails(UUID taskId, String studentEmail);
    
    /**
     * Submit a task (mark as completed with optional notes)
     */
    void submitTask(UUID taskId, String studentEmail, String notes);
    
    /**
     * Get all groups the student is part of
     */
    List<StudentGroupDto> getStudentGroups(String studentEmail);
    
    /**
     * Get detailed information about a specific group
     */
    StudentGroupDto getGroupDetails(UUID groupId, String studentEmail);
    
    /**
     * Get all projects the student is involved in
     */
    List<StudentProjectDto> getStudentProjects(String studentEmail);
    
    /**
     * Get detailed information about a specific project
     */
    StudentProjectDto getProjectDetails(UUID projectId, String studentEmail);
    
    /**
     * Get student profile and academic information
     */
    Map<String, Object> getStudentProfile(String studentEmail);
    
    /**
     * Get notifications for student
     */
    List<Map<String, Object>> getNotifications(String studentEmail, boolean unreadOnly);
    
    /**
     * Mark a notification as read
     */
    void markNotificationAsRead(UUID notificationId, String studentEmail);
    
    /**
     * Get upcoming deadlines for student
     */
    List<Map<String, Object>> getUpcomingDeadlines(String studentEmail, int days);
    
    /**
     * Get submission history for student
     */
    Page<Map<String, Object>> getSubmissions(String studentEmail, Pageable pageable);
    
    /**
     * Get repositories accessible to student (group repos, etc.)
     */
    List<Map<String, Object>> getAccessibleRepositories(String studentEmail);
    
    /**
     * Get detailed GitHub repository information
     */
    Map<String, Object> getRepositoryDetails(String repositoryId, String studentEmail);
    
    /**
     * Get GitHub repository details directly by owner/repo name
     */
    Map<String, Object> getGitHubRepositoryByFullName(String owner, String repo, String studentEmail);
    
    /**
     * Get all GitHub repositories accessible to the student through group memberships
     */
    List<Map<String, Object>> getStudentGitHubRepositories(String studentEmail);
    
    /**
     * Get student's academic progress and statistics
     */
    Map<String, Object> getAcademicProgress(String studentEmail);
    
    /**
     * Get student's weekly schedule/tasks
     */
    List<Map<String, Object>> getWeeklySchedule(String studentEmail);
    
    /**
     * Get student's recent activities
     */
    List<Map<String, Object>> getRecentActivities(String studentEmail, int limit);
    
    // GitHub repository file operations
    List<Map<String, Object>> getRepositoryFiles(String owner, String repo, String path, String branch, String studentEmail);
    
    Map<String, Object> getFileContent(String owner, String repo, String path, String branch, String studentEmail);
    
    List<Map<String, Object>> getRepositoryCommits(String owner, String repo, String branch, int page, int perPage, String studentEmail);
    
    List<Map<String, Object>> getRepositoryBranches(String owner, String repo, String studentEmail);
    
    Map<String, Object> createFile(String owner, String repo, String path, String content, String message, String branch, String studentEmail);
    
    Map<String, Object> updateFile(String owner, String repo, String path, String content, String message, String sha, String branch, String studentEmail);
    
    Map<String, Object> deleteFile(String owner, String repo, String path, String message, String sha, String branch, String studentEmail);
    
    Map<String, Object> createBranch(String owner, String repo, String branchName, String fromBranch, String studentEmail);
    
    List<Map<String, Object>> getRepositoryContributors(String owner, String repo, String studentEmail);
    
    // Repository overview and file tree operations
    Map<String, Object> getRepositoryOverview(String owner, String repo, String branch, String studentEmail);
    
    Map<String, Object> getRepositoryFileTree(String owner, String repo, String branch, String studentEmail);
    
    // Debug method to test GitHub access
    Map<String, Object> debugGitHubAccess(String studentEmail);
}
