package tn.esprithub.server.repository.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.SuperBuilder;
import tn.esprithub.server.common.entity.BaseEntity;
import tn.esprithub.server.project.entity.Group;
import tn.esprithub.server.user.entity.User;

@Entity
@Table(name = "repositories")
@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Repository extends BaseEntity {
    
    @NotBlank
    @Column(nullable = false, length = 255)
    private String name;
    
    @NotBlank
    @Column(nullable = false, length = 255, unique = true)
    private String fullName;
    
    @Column(length = 500)
    private String description;
    
    @NotBlank
    @Column(nullable = false, length = 500)
    private String url;
    
    @Builder.Default
    @Column(nullable = false)
    private Boolean isPrivate = true;
    
    @Column(name = "default_branch", length = 100)
    @Builder.Default
    private String defaultBranch = "main";
    
    @Column(name = "clone_url", length = 500)
    private String cloneUrl;
    
    @Column(name = "ssh_url", length = 500)
    private String sshUrl;
    
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    // The teacher/user who owns the repository
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false, foreignKey = @ForeignKey(name = "fk_repository_owner"))
    private User owner;
    
    // One-to-one relationship with group (optional, as repos can exist without groups)
    @OneToOne(mappedBy = "repository", fetch = FetchType.LAZY)
    private Group group;
}
