package tn.esprithub.server.project.service;

import tn.esprithub.server.project.entity.Task;
import java.util.List;
import java.util.UUID;

public interface TaskService {
    Task createTask(Task task);
    Task updateTask(UUID id, Task task);
    void deleteTask(UUID id);
    Task getTaskById(UUID id);
    List<Task> getAllTasks();
    List<Task> getTasksByClasseId(UUID classeId);
    List<Task> getTasksByProjectId(UUID projectId);
}
