package tn.esprithub.server.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprithub.server.project.entity.Group;

@Repository
public interface GroupRepository extends JpaRepository<Group, java.util.UUID> {
}
