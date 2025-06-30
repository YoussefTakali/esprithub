package tn.esprithub.server.project.mapper;

import org.springframework.stereotype.Component;
import tn.esprithub.server.project.dto.TaskCreateDto;
import tn.esprithub.server.project.dto.TaskDto;
import tn.esprithub.server.project.dto.TaskUpdateDto;
import tn.esprithub.server.project.entity.Task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class TaskMapper {
    private static final Logger log = LoggerFactory.getLogger(TaskMapper.class);

    public TaskDto toDto(Task task) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setDueDate(task.getDueDate());
        dto.setType(task.getType());
        dto.setStatus(task.getStatus());
        dto.setGraded(task.isGraded());
        dto.setVisible(task.isVisible());
        // Map projects
        if (task.getProjects() != null)
            dto.setProjectIds(task.getProjects().stream().map(p -> p.getId()).toList());
        // Map groups
        if (task.getAssignedToGroups() != null)
            dto.setGroupIds(task.getAssignedToGroups().stream().map(g -> g.getId()).toList());
        // Map students
        if (task.getAssignedToStudents() != null)
            dto.setStudentIds(task.getAssignedToStudents().stream().map(s -> s.getId()).toList());
        // Map classes
        if (task.getAssignedToClasses() != null)
            dto.setClasseIds(task.getAssignedToClasses().stream().map(c -> c.getId()).toList());
        return dto;
    }

    public void updateEntity(TaskUpdateDto dto, Task task) {
        if (dto.getTitle() != null) task.setTitle(dto.getTitle());
        if (dto.getDescription() != null) task.setDescription(dto.getDescription());
        if (dto.getDueDate() != null) task.setDueDate(dto.getDueDate());
        if (dto.getType() != null) task.setType(dto.getType());
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
        log.info("[TaskMapper] updateEntity: dto.isVisible={} (before), task.isVisible={} (before)", dto.getIsVisible(), task.isVisible());
        task.setGraded(dto.isGraded());
        if (dto.getIsVisible() != null) task.setVisible(dto.getIsVisible());
        log.info("[TaskMapper] updateEntity: task.isVisible={} (after)", task.isVisible());
        // Scopes should be set in service
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
        // Scopes should be set in service
        return task;
    }
}
