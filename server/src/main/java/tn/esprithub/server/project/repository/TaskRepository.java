package tn.esprithub.server.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprithub.server.project.entity.Task;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, java.util.UUID> {
    List<Task> findByAssignedToClasseId(java.util.UUID classeId);
    List<Task> findByProjectId(java.util.UUID projectId);
}
