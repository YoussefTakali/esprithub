package tn.esprithub.server.project.service.impl;

import org.springframework.stereotype.Service;
import tn.esprithub.server.project.entity.Task;
import tn.esprithub.server.project.repository.TaskRepository;
import tn.esprithub.server.project.service.TaskService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TaskServiceImpl implements TaskService {
    private final TaskRepository taskRepository;

    public TaskServiceImpl(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Override
    public Task createTask(Task task) {
        return taskRepository.save(task);
    }

    @Override
    public Task updateTask(UUID id, Task task) {
        task.setId(id);
        return taskRepository.save(task);
    }

    @Override
    public void deleteTask(UUID id) {
        taskRepository.deleteById(id);
    }

    @Override
    public Task getTaskById(UUID id) {
        Optional<Task> task = taskRepository.findById(id);
        return task.orElse(null);
    }

    @Override
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @Override
    public List<Task> getTasksByClasseId(UUID classeId) {
        return taskRepository.findByAssignedToClasseId(classeId);
    }

    @Override
    public List<Task> getTasksByProjectId(UUID projectId) {
        return taskRepository.findByProjectId(projectId);
    }
}
