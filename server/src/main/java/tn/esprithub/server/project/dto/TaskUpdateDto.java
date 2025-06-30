package tn.esprithub.server.project.dto;

import lombok.Data;
import tn.esprithub.server.project.enums.TaskAssignmentType;
import tn.esprithub.server.project.enums.TaskStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class TaskUpdateDto {
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private TaskAssignmentType type;
    private List<UUID> groupIds;
    private List<UUID> studentIds;
    private List<UUID> classeIds;
    private List<UUID> projectIds;
    private TaskStatus status;
    private boolean isGraded;
    private Boolean isVisible;
}
