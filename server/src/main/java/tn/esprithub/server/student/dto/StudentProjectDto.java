package tn.esprithub.server.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProjectDto {
    
    private UUID id;
    private String name;
    private String description;
    private LocalDateTime deadline;
    private boolean isOverdue;
    private int daysLeft;
    
    // Teacher information
    private String teacherName;
    private String teacherEmail;
    private UUID teacherId;
    
    // Class assignment
    private UUID classId;
    private String className;
    
    // Student's involvement
    private UUID myGroupId;
    private String myGroupName;
    private List<String> myGroupMembers;
    private String myRole; // MEMBER, LEADER
    
    // Project progress
    private double completionRate; // Overall project completion
    private double myGroupProgress; // My group's progress
    private String currentPhase; // PLANNING, DEVELOPMENT, TESTING, COMPLETED
    
    // Tasks in this project
    private List<ProjectTaskDto> tasks;
    private int totalTasks;
    private int completedTasks;
    private int myCompletedTasks;
    
    // Repository information
    private UUID repositoryId;
    private String repositoryName;
    private String repositoryUrl;
    private boolean hasRepository;
    
    // Collaboration stats
    private int totalGroups;
    private int activeGroups;
    private List<ProjectGroupDto> allGroups; // Other groups in the project
    
    // Recent activity
    private List<ProjectActivityDto> recentActivities;
    private LocalDateTime lastActivity;
    
    // Submission and grading
    private boolean isSubmitted;
    private LocalDateTime submissionDate;
    private Double grade;
    private String feedback;
    private boolean isGraded;
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status; // ACTIVE, COMPLETED, CANCELLED
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectTaskDto {
        private UUID id;
        private String title;
        private String description;
        private LocalDateTime dueDate;
        private String status;
        private boolean isAssignedToMe;
        private boolean isAssignedToMyGroup;
        private boolean isCompleted;
        private boolean isOverdue;
        private int daysLeft;
        private String assignmentType; // INDIVIDUAL, GROUP, CLASS
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectGroupDto {
        private UUID id;
        private String name;
        private int memberCount;
        private double progressPercentage;
        private String status;
        private boolean isMyGroup;
        private List<String> memberNames;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectActivityDto {
        private String type; // TASK_COMPLETED, GROUP_CREATED, SUBMISSION_MADE, etc.
        private String description;
        private String actorName;
        private LocalDateTime timestamp;
        private UUID relatedEntityId;
        private String relatedEntityType; // TASK, GROUP, SUBMISSION
    }
}
