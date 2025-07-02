package tn.esprithub.server.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDashboardDto {
    
    // Student basic info
    private String studentName;
    private String studentEmail;
    private String className;
    private String departmentName;
    private String levelName;
    
    // Summary statistics
    private int totalTasks;
    private int pendingTasks;
    private int completedTasks;
    private int overdueTasks;
    
    private int totalProjects;
    private int activeProjects;
    private int completedProjects;
    
    private int totalGroups;
    private int activeGroups;
    
    // Recent activities
    private List<RecentActivityDto> recentActivities;
    
    // Upcoming deadlines
    private List<UpcomingDeadlineDto> upcomingDeadlines;
    
    // Current week schedule
    private List<WeeklyTaskDto> weeklyTasks;
    
    // Quick stats
    private Map<String, Integer> taskStatusCounts;
    private Map<String, Integer> projectStatusCounts;
    
    // Notifications
    private int unreadNotifications;
    private List<NotificationDto> recentNotifications;
    
    // Academic progress
    private double completionRate; // Percentage of completed tasks
    private int submissionsThisMonth;
    private String currentSemester;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentActivityDto {
        private String type; // TASK_ASSIGNED, TASK_COMPLETED, PROJECT_CREATED, etc.
        private String title;
        private String description;
        private LocalDateTime timestamp;
        private String relatedEntityId; // Task ID, Project ID, etc.
        private String relatedEntityType; // TASK, PROJECT, GROUP
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingDeadlineDto {
        private String id;
        private String title;
        private String type; // TASK, PROJECT
        private LocalDateTime deadline;
        private int daysLeft;
        private String priority; // HIGH, MEDIUM, LOW
        private String status;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyTaskDto {
        private String id;
        private String title;
        private String type;
        private LocalDateTime dueDate;
        private String status;
        private String priority;
        private boolean isOverdue;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationDto {
        private String id;
        private String title;
        private String message;
        private String type; // INFO, WARNING, SUCCESS, ERROR
        private LocalDateTime timestamp;
        private boolean isRead;
        private String actionUrl; // Optional link to related content
    }
}
