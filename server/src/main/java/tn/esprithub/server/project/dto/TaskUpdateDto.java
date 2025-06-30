package tn.esprithub.server.project.dto;

import lombok.Data;
import tn.esprithub.server.project.enums.TaskAssignmentType;
import tn.esprithub.server.project.enums.TaskStatus;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TaskUpdateDto {
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private TaskAssignmentType type;
    private UUID groupId;
    private UUID studentId;
    private UUID classeId;
    private TaskStatus status;
    private boolean isGraded;
    private boolean isVisible;
}
