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
public class StudentGroupDto {
    
    private UUID id;
    private String name;
    private String description;
    
    // Project information
    private UUID projectId;
    private String projectName;
    private String projectDescription;
    private LocalDateTime projectDeadline;
    
    // Class information
    private UUID classId;
    private String className;
    
    // Group members
    private List<GroupMemberDto> members;
    private int totalMembers;
    private String myRole; // MEMBER, LEADER (if applicable)
    
    // Repository information
    private UUID repositoryId;
    private String repositoryName;
    private String repositoryUrl;
    private String repositoryCloneUrl;
    private boolean hasRepository;
    
    // Tasks assigned to this group
    private List<GroupTaskDto> assignedTasks;
    private int totalTasks;
    private int completedTasks;
    private int pendingTasks;
    
    // Progress tracking
    private double completionRate; // Percentage of completed tasks
    private LocalDateTime lastActivity;
    private String currentStatus; // ACTIVE, COMPLETED, INACTIVE
    
    // Collaboration stats
    private int totalCommits; // If repository exists
    private int myCommits;
    private String mostActiveContributor;
    
    // Communication
    private List<GroupAnnouncementDto> recentAnnouncements;
    private boolean hasUnreadMessages;
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupMemberDto {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
        private String fullName;
        private boolean isOnline; // If tracking online status
        private LocalDateTime lastActive;
        private int contributionScore; // Based on commits, task completions, etc.
        private String role; // MEMBER, LEADER
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupTaskDto {
        private UUID id;
        private String title;
        private String description;
        private LocalDateTime dueDate;
        private String status;
        private boolean isOverdue;
        private int daysLeft;
        private boolean isCompleted;
        private double progressPercentage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupAnnouncementDto {
        private UUID id;
        private String title;
        private String message;
        private String authorName;
        private LocalDateTime timestamp;
        private String type; // INFO, URGENT, REMINDER
        private boolean isRead;
    }
}
