package tn.esprithub.server.project.mapper;

import org.springframework.stereotype.Component;
import tn.esprithub.server.project.dto.TaskCreateDto;
import tn.esprithub.server.project.dto.TaskDto;
import tn.esprithub.server.project.dto.TaskUpdateDto;
import tn.esprithub.server.project.entity.Task;

@Component
public class TaskMapper {
    public TaskDto toDto(Task task) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setDueDate(task.getDueDate());
        dto.setProjectId(task.getProject() != null ? task.getProject().getId() : null);
        dto.setType(task.getType());
        dto.setGroupId(task.getAssignedToGroup() != null ? task.getAssignedToGroup().getId() : null);
        dto.setStudentId(task.getAssignedToStudent() != null ? task.getAssignedToStudent().getId() : null);
        dto.setClasseId(task.getAssignedToClasse() != null ? task.getAssignedToClasse().getId() : null);
        dto.setStatus(task.getStatus());
        dto.setGraded(task.isGraded());
        dto.setVisible(task.isVisible());
        return dto;
    }

    public void updateEntity(TaskUpdateDto dto, Task task) {
        if (dto.getTitle() != null) task.setTitle(dto.getTitle());
        if (dto.getDescription() != null) task.setDescription(dto.getDescription());
        if (dto.getDueDate() != null) task.setDueDate(dto.getDueDate());
        if (dto.getType() != null) task.setType(dto.getType());
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
        task.setGraded(dto.isGraded());
        task.setVisible(dto.isVisible());
        // groupId, studentId, classeId, projectId should be set in service with proper entity lookup
    }

    public Task toEntity(TaskCreateDto dto) {
        Task task = new Task();
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setDueDate(dto.getDueDate());
        task.setType(dto.getType());
        task.setStatus(dto.getStatus());
        task.setGraded(dto.isGraded());
        task.setVisible(dto.isVisible());
        // groupId, studentId, classeId, projectId should be set in service with proper entity lookup
        return task;
    }
}
