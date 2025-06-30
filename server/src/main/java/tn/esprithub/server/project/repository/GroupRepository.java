package tn.esprithub.server.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprithub.server.project.entity.Group;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, java.util.UUID> {
    List<Group> findByProjectId(UUID projectId);
    List<Group> findByProjectIdAndClasseId(UUID projectId, UUID classeId);
}
