package tn.esprithub.server.project.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.UuidGenerator;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.project.entity.Task;
import tn.esprithub.server.project.entity.Project;
import tn.esprithub.server.academic.entity.Classe;
import tn.esprithub.server.project.entity.Group;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Submission {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(optional = false)
    private Task task;

    @ManyToOne
    private User student; // nullable for group submission

    @ManyToOne
    private Group group; // nullable for individual submission

    @ManyToOne
    private Project project; // context, optional

    @ManyToOne
    private Classe classe; // context, optional

    private LocalDateTime submittedAt;

    private String fileUrl; // or blob, or text, etc.

    // Add more fields as needed (grade, feedback, etc.)
}
