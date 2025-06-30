package tn.esprithub.server.project.service.impl;

import org.springframework.stereotype.Service;
import tn.esprithub.server.academic.entity.Classe;
import tn.esprithub.server.academic.repository.ClasseRepository;
import tn.esprithub.server.project.entity.Group;
import tn.esprithub.server.project.repository.GroupRepository;
import tn.esprithub.server.project.service.GroupService;
import tn.esprithub.server.project.repository.ProjectRepository;
import tn.esprithub.server.user.repository.UserRepository;
import tn.esprithub.server.project.entity.Project;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import tn.esprithub.server.project.dto.GroupCreateDto;
import tn.esprithub.server.project.dto.GroupUpdateDto;
import tn.esprithub.server.integration.github.GithubService;

@Service
public class GroupServiceImpl implements GroupService {
    private static final Logger logger = LoggerFactory.getLogger(GroupServiceImpl.class);
    private final GroupRepository groupRepository;
    private final ClasseRepository classeRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final GithubService githubService;

    public GroupServiceImpl(GroupRepository groupRepository, ClasseRepository classeRepository, ProjectRepository projectRepository, UserRepository userRepository, GithubService githubService) {
        this.groupRepository = groupRepository;
        this.classeRepository = classeRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.githubService = githubService;
    }

    @Override
    public Group createGroup(Group group) {
        logger.info("Incoming group payload: {}", group);
        if (group.getClasse() == null || group.getClasse().getId() == null) {
            throw new IllegalArgumentException("Missing or invalid 'classe' (class) in group payload");
        }
        if (group.getProject() == null || group.getProject().getId() == null) {
            throw new IllegalArgumentException("Missing or invalid 'project' in group payload");
        }
        if (group.getStudents() == null || group.getStudents().isEmpty()) {
            throw new IllegalArgumentException("Group must have at least one student");
        }
        // Fetch and set managed Classe
        Classe managedClasse = classeRepository.findById(group.getClasse().getId()).orElseThrow(() -> new IllegalArgumentException("Classe not found with provided id"));
        group.setClasse(managedClasse);
        // Fetch and set managed Project
        Project managedProject = projectRepository.findById(group.getProject().getId()).orElseThrow(() -> new IllegalArgumentException("Project not found with provided id"));
        group.setProject(managedProject);
        // Fetch and set managed Students
        group.setStudents(group.getStudents().stream()
            .map(s -> userRepository.findById(s.getId()).orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + s.getId())))
            .toList());
        return groupRepository.save(group);
    }

    @Override
    public Group createGroup(GroupCreateDto dto) {
        logger.info("Incoming group create DTO: {}", dto);
        if (dto.getClasseId() == null) {
            throw new IllegalArgumentException("Missing or invalid 'classeId' in group payload");
        }
        if (dto.getProjectId() == null) {
            throw new IllegalArgumentException("Missing or invalid 'projectId' in group payload");
        }
        if (dto.getStudentIds() == null || dto.getStudentIds().isEmpty()) {
            throw new IllegalArgumentException("Group must have at least one student");
        }
        Classe managedClasse = classeRepository.findById(dto.getClasseId()).orElseThrow(() -> new IllegalArgumentException("Classe not found with provided id"));
        Project managedProject = projectRepository.findById(dto.getProjectId()).orElseThrow(() -> new IllegalArgumentException("Project not found with provided id"));
        var managedStudents = dto.getStudentIds().stream()
            .map(id -> userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id)))
            .toList();
        Group group = new Group();
        group.setName(dto.getName());
        group.setClasse(managedClasse);
        group.setProject(managedProject);
        group.setStudents(managedStudents);
        Group savedGroup = groupRepository.save(group);
        // --- GITHUB INTEGRATION ---
        try {
            // Compose repo name: projectName-className-groupName
            String repoName = managedProject.getName() + "-" + managedClasse.getNom() + "-" + group.getName();
            String creatorToken = managedStudents.get(0).getGithubToken();
            String repoFullName = githubService.createRepositoryForUser(repoName, creatorToken);
            if (repoFullName != null && !repoFullName.isBlank()) {
                logger.info("GitHub repository created successfully: {}", repoFullName);
            } else {
                logger.warn("GitHub repository creation returned empty repo name for group: {}", savedGroup.getName());
            }
            for (var student : managedStudents) {
                if (student.getGithubUsername() != null && !student.getGithubUsername().isBlank()) {
                    githubService.inviteUserToRepo(repoFullName, student.getGithubUsername(), creatorToken);
                    githubService.createBranch(repoFullName, student.getFirstName() + student.getLastName(), creatorToken);
                }
            }
        } catch (Exception e) {
            logger.error("GitHub integration failed for group {}: {}", savedGroup.getName(), e.getMessage());
            // Optionally: throw or handle gracefully
        }
        return savedGroup;
    }

    @Override
    public Group updateGroup(UUID id, GroupUpdateDto dto) {
        if (dto.getClasseId() == null) {
            throw new IllegalArgumentException("Missing or invalid 'classeId' in group payload");
        }
        if (dto.getProjectId() == null) {
            throw new IllegalArgumentException("Missing or invalid 'projectId' in group payload");
        }
        if (dto.getStudentIds() == null || dto.getStudentIds().isEmpty()) {
            throw new IllegalArgumentException("Group must have at least one student");
        }
        Classe managedClasse = classeRepository.findById(dto.getClasseId()).orElseThrow(() -> new IllegalArgumentException("Classe not found with provided id"));
        Project managedProject = projectRepository.findById(dto.getProjectId()).orElseThrow(() -> new IllegalArgumentException("Project not found with provided id"));
        var managedStudentIds = dto.getStudentIds();
        var managedStudents = managedStudentIds.stream()
            .map(studentId -> userRepository.findById(studentId).orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + studentId)))
            .toList();
        Group group = groupRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Group not found with provided id"));
        group.setName(dto.getName());
        group.setClasse(managedClasse);
        group.setProject(managedProject);
        group.setStudents(new java.util.ArrayList<>(managedStudents));
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

    @Override
    public List<Group> getGroupsByProjectId(UUID projectId) {
        return groupRepository.findByProjectId(projectId);
    }

    @Override
    public List<Group> getGroupsByProjectIdAndClasseId(UUID projectId, UUID classeId) {
        return groupRepository.findByProjectIdAndClasseId(projectId, classeId);
    }
}
