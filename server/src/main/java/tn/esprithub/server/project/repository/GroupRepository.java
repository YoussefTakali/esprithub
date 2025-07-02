package tn.esprithub.server.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprithub.server.project.entity.Group;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {
    List<Group> findByProjectId(UUID projectId);
    List<Group> findByProjectIdAndClasseId(UUID projectId, UUID classeId);
    
    // Find groups that a student is a member of
    @Query("SELECT g FROM Group g JOIN g.students s WHERE s.id = :studentId")
    List<Group> findGroupsByStudentId(@Param("studentId") UUID studentId);
}
