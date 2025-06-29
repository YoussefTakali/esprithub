package tn.esprithub.server.project.service;

import tn.esprithub.server.project.entity.Group;
import java.util.List;
import java.util.UUID;

public interface GroupService {
    Group createGroup(Group group);
    Group updateGroup(UUID id, Group group);
    void deleteGroup(UUID id);
    Group getGroupById(UUID id);
    List<Group> getAllGroups();
}
