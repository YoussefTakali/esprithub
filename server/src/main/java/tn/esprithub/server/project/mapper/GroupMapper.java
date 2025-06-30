package tn.esprithub.server.project.mapper;

import tn.esprithub.server.project.dto.GroupDto;
import tn.esprithub.server.project.entity.Group;
import java.util.stream.Collectors;

public class GroupMapper {
    public static GroupDto toDto(Group group) {
        GroupDto dto = new GroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setProjectId(group.getProject() != null ? group.getProject().getId() : null);
        dto.setClasseId(group.getClasse() != null ? group.getClasse().getId() : null);
        dto.setStudentIds(group.getStudents() != null ? group.getStudents().stream().map(s -> s.getId()).collect(Collectors.toList()) : null);
        return dto;
    }
}
