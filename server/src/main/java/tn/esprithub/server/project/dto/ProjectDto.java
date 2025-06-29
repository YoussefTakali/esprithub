package tn.esprithub.server.project.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
public class ProjectDto {
    private UUID id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private SimpleUserDto createdBy;
    private List<SimpleUserDto> collaborators;
    private List<UUID> classIds;
    private List<UUID> groupIds;
    private List<UUID> taskIds;

    @Data
    public static class SimpleUserDto {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
    }
}
