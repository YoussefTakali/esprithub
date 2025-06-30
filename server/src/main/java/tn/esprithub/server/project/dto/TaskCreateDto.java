package tn.esprithub.server.project.dto;

import lombok.Data;
import tn.esprithub.server.project.enums.TaskAssignmentType;
import tn.esprithub.server.project.enums.TaskStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class TaskCreateDto {
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private List<UUID> projectIds;
    private TaskAssignmentType type;
    private List<UUID> groupIds;
    private List<UUID> studentIds;
    private List<UUID> classeIds;
    private TaskStatus status;
    private boolean isGraded;
    private boolean isVisible;
}
