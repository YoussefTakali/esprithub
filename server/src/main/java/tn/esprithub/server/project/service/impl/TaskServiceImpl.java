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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TaskServiceImpl implements TaskService {
    private static final Logger log = LoggerFactory.getLogger(TaskServiceImpl.class);
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
    public TaskDto updateTask(UUID id, TaskUpdateDto dto) {
        Task task = taskRepository.findById(id).orElseThrow();
        log.info("[TaskServiceImpl] updateTask: dto.isVisible={}, task.isVisible={} (before)", dto.getIsVisible(), task.isVisible());
        taskMapper.updateEntity(dto, task);
        log.info("[TaskServiceImpl] updateTask: task.isVisible={} (after mapping)", task.isVisible());
        // Update projects
        if (dto.getProjectIds() != null) {
            List<Project> projects = projectRepository.findAllById(dto.getProjectIds());
            task.setProjects(new ArrayList<>(projects));
        }
        // Update groups
        if (dto.getGroupIds() != null) {
            List<Group> groups = groupRepository.findAllById(dto.getGroupIds());
            task.setAssignedToGroups(new ArrayList<>(groups));
        }
        // Update classes
        if (dto.getClasseIds() != null) {
            List<Classe> classes = classeRepository.findAllById(dto.getClasseIds());
            task.setAssignedToClasses(new ArrayList<>(classes));
        }
        // Update students
        if (dto.getStudentIds() != null) {
            List<User> students = userRepository.findAllById(dto.getStudentIds());
            task.setAssignedToStudents(new ArrayList<>(students));
        }
        TaskDto result = taskMapper.toDto(taskRepository.save(task));
        log.info("[TaskServiceImpl] updateTask: task.isVisible={} (after save)", result.isVisible());
        return result;
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
        return taskRepository.findByAssignedToClasses_Id(classeId).stream().map(taskMapper::toDto).toList();
    }

    @Override
    public List<TaskDto> getTasksByProjectId(UUID projectId) {
        return taskRepository.findByProjects_Id(projectId).stream().map(taskMapper::toDto).toList();
    }

    @Override
    public List<TaskDto> createTasks(TaskCreateDto dto) {
        Task task = taskMapper.toEntity(dto);
        // Set projects
        if (dto.getProjectIds() != null) {
            List<Project> projects = projectRepository.findAllById(dto.getProjectIds());
            task.setProjects(new ArrayList<>(projects));
        }
        // Set groups
        if (dto.getGroupIds() != null) {
            List<Group> groups = groupRepository.findAllById(dto.getGroupIds());
            task.setAssignedToGroups(new ArrayList<>(groups));
        }
        // Set classes
        if (dto.getClasseIds() != null) {
            List<Classe> classes = classeRepository.findAllById(dto.getClasseIds());
            task.setAssignedToClasses(new ArrayList<>(classes));
        }
        // Set students
        if (dto.getStudentIds() != null) {
            List<User> students = userRepository.findAllById(dto.getStudentIds());
            task.setAssignedToStudents(new ArrayList<>(students));
        }
        Task saved = taskRepository.save(task);
        return List.of(taskMapper.toDto(saved));
    }
}
