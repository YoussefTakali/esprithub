package tn.esprithub.server.project.service.impl;

import org.springframework.stereotype.Service;
import tn.esprithub.server.project.entity.Group;
import tn.esprithub.server.project.repository.GroupRepository;
import tn.esprithub.server.project.service.GroupService;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GroupServiceImpl implements GroupService {
    private final GroupRepository groupRepository;

    public GroupServiceImpl(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    @Override
    public Group createGroup(Group group) {
        return groupRepository.save(group);
    }

    @Override
    public Group updateGroup(UUID id, Group group) {
        group.setId(id);
        return groupRepository.save(group);
    }

    @Override
    public void deleteGroup(UUID id) {
        groupRepository.deleteById(id);
    }

    @Override
    public Group getGroupById(UUID id) {
        Optional<Group> group = groupRepository.findById(id);
        return group.orElse(null);
    }

    @Override
    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }
}
