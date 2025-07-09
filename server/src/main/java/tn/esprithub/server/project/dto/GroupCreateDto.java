package tn.esprithub.server.project.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class GroupCreateDto {
    private String name;
    private UUID projectId;
    private UUID classeId;
    private List<UUID> studentIds;
}
