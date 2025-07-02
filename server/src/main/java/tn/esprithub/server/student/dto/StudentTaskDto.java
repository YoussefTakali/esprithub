package tn.esprithub.server.student.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.esprithub.server.project.enums.TaskStatus;
import tn.esprithub.server.project.enums.TaskAssignmentType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentTaskDto {
    
    private UUID id;
    private String title;
    private String description;
    private TaskAssignmentType assignmentType; // INDIVIDUAL, GROUP, CLASS
    private TaskStatus status;
    private LocalDateTime dueDate;
    private boolean isGraded;
    private boolean isVisible;
    private boolean isOverdue;
    
    // Assignment context
    private String assignedTo; // Individual, Group name, or Class name
    private UUID assignedToId; // Student ID, Group ID, or Class ID
    
    // Project information
    private UUID projectId;
    private String projectName;
    private String projectDescription;
    
    // Teacher information
    private String teacherName;
    private String teacherEmail;
    
    // Group information (if assigned to group)
    private UUID groupId;
    private String groupName;
    private List<String> groupMembers;
    
    // Submission information
    private boolean isSubmitted;
    private LocalDateTime submissionDate;
    private String submissionNotes;
    private Double grade; // If graded
    private String feedback; // Teacher feedback
    
    // Repository information (if applicable)
    private UUID repositoryId;
    private String repositoryName;
    private String repositoryUrl;
    private String repositoryBranch;
    
    // Deadlines and time tracking
    private int daysLeft;
    private String urgencyLevel; // HIGH, MEDIUM, LOW
    private boolean canSubmit;
    
    // Additional metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> tags; // Optional tags for categorization
    private String priority; // Task priority level
    
    // Collaboration info
    private int totalCollaborators; // For group tasks
    private int completedByCollaborators; // How many have submitted
    
    // Related tasks (if part of a series)
    private List<RelatedTaskDto> relatedTasks;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatedTaskDto {
        private UUID id;
        private String title;
        private TaskStatus status;
        private LocalDateTime dueDate;
        private boolean isCompleted;
    }
}
