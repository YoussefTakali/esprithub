package tn.esprithub.server.project.service.impl;

import org.springframework.stereotype.Service;
import tn.esprithub.server.project.entity.Task;
import tn.esprithub.server.project.repository.TaskRepository;
import tn.esprithub.server.project.service.TaskService;
import tn.esprithub.server.project.dto.TaskCreateDto;
import tn.esprithub.server.project.dto.TaskUpdateDto;
import tn.esprithub.server.project.dto.TaskDto;
import tn.esprithub.server.project.mapper.TaskMapper;
import tn.esprithub.server.project.entity.Project;
import tn.esprithub.server.project.entity.Group;
import tn.esprithub.server.academic.entity.Classe;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.project.repository.ProjectRepository;
import tn.esprithub.server.project.repository.GroupRepository;
import tn.esprithub.server.academic.repository.ClasseRepository;
import tn.esprithub.server.user.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TaskServiceImpl implements TaskService {
    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final ProjectRepository projectRepository;
    private final GroupRepository groupRepository;
    private final ClasseRepository classeRepository;
    private final UserRepository userRepository;

    public TaskServiceImpl(TaskRepository taskRepository, TaskMapper taskMapper, ProjectRepository projectRepository, GroupRepository groupRepository, ClasseRepository classeRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.taskMapper = taskMapper;
        this.projectRepository = projectRepository;
        this.groupRepository = groupRepository;
        this.classeRepository = classeRepository;
        this.userRepository = userRepository;
    }

    @Override
    public TaskDto createTask(TaskCreateDto dto) {
        Task task = taskMapper.toEntity(dto);
        if (dto.getProjectId() != null) {
            Project project = projectRepository.findById(dto.getProjectId()).orElseThrow();
            task.setProject(project);
        }
        if (dto.getGroupId() != null) {
            Group group = groupRepository.findById(dto.getGroupId()).orElse(null);
            task.setAssignedToGroup(group);
        }
        if (dto.getClasseId() != null) {
            Classe classe = classeRepository.findById(dto.getClasseId()).orElse(null);
            task.setAssignedToClasse(classe);
        }
        if (dto.getStudentId() != null) {
            User student = userRepository.findById(dto.getStudentId()).orElse(null);
            task.setAssignedToStudent(student);
        }
        return taskMapper.toDto(taskRepository.save(task));
    }

    @Override
    public TaskDto updateTask(UUID id, TaskUpdateDto dto) {
        Task task = taskRepository.findById(id).orElseThrow();
        taskMapper.updateEntity(dto, task);
        if (dto.getGroupId() != null) {
            Group group = groupRepository.findById(dto.getGroupId()).orElse(null);
            task.setAssignedToGroup(group);
        }
        if (dto.getClasseId() != null) {
            Classe classe = classeRepository.findById(dto.getClasseId()).orElse(null);
            task.setAssignedToClasse(classe);
        }
        if (dto.getStudentId() != null) {
            User student = userRepository.findById(dto.getStudentId()).orElse(null);
            task.setAssignedToStudent(student);
        }
        return taskMapper.toDto(taskRepository.save(task));
    }

    @Override
    public void deleteTask(UUID id) {
        taskRepository.deleteById(id);
    }

    @Override
    public TaskDto getTaskById(UUID id) {
        return taskRepository.findById(id).map(taskMapper::toDto).orElse(null);
    }

    @Override
    public List<TaskDto> getAllTasks() {
        return taskRepository.findAll().stream().map(taskMapper::toDto).toList();
    }

    @Override
    public List<TaskDto> getTasksByClasseId(UUID classeId) {
        return taskRepository.findByAssignedToClasseId(classeId).stream().map(taskMapper::toDto).toList();
    }

    @Override
    public List<TaskDto> getTasksByProjectId(UUID projectId) {
        return taskRepository.findByProjectId(projectId).stream().map(taskMapper::toDto).toList();
    }
}
