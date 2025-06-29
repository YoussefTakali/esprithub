package tn.esprithub.server.project.service.impl;

import org.springframework.stereotype.Service;
import tn.esprithub.server.project.entity.Project;
import tn.esprithub.server.project.repository.ProjectRepository;
import tn.esprithub.server.project.service.ProjectService;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.user.repository.UserRepository;
import tn.esprithub.server.project.dto.TeacherClassCourseDto;
import tn.esprithub.server.academic.repository.ClasseRepository;
import tn.esprithub.server.academic.repository.CourseAssignmentRepository;
import tn.esprithub.server.academic.entity.Classe;
import tn.esprithub.server.academic.entity.CourseAssignment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProjectServiceImpl implements ProjectService {
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ClasseRepository classeRepository;
    private final CourseAssignmentRepository courseAssignmentRepository;

    public ProjectServiceImpl(ProjectRepository projectRepository, UserRepository userRepository, ClasseRepository classeRepository, CourseAssignmentRepository courseAssignmentRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.classeRepository = classeRepository;
        this.courseAssignmentRepository = courseAssignmentRepository;
    }

    @Override
    public Project createProject(Project project) {
        return projectRepository.save(project);
    }

    @Override
    public Project updateProject(UUID id, Project project) {
        project.setId(id);
        return projectRepository.save(project);
    }

    @Override
    public void deleteProject(UUID id) {
        projectRepository.deleteById(id);
    }

    @Override
    public Project getProjectById(UUID id) {
        Optional<Project> project = projectRepository.findById(id);
        return project.orElse(null);
    }

    @Override
    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    @Override
    public Project addCollaborator(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        if (!project.getCollaborators().contains(user)) {
            project.getCollaborators().add(user);
            projectRepository.save(project);
        }
        return project;
    }

    @Override
    public Project removeCollaborator(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        if (project.getCollaborators().contains(user)) {
            project.getCollaborators().remove(user);
            projectRepository.save(project);
        }
        return project;
    }

    @Override
    public List<TeacherClassCourseDto> getMyClassesWithCourses(User teacher) {
        // Get all classes where the teacher is assigned
        List<Classe> classes = classeRepository.findByTeachers_Id(teacher.getId());
        return classes.stream().map(classe -> {
            // Find course assignment for this teacher and class's niveau
            List<CourseAssignment> assignments = courseAssignmentRepository.findByNiveauId(classe.getNiveau().getId());
            String courseName = assignments.stream()
                .filter(a -> a.getTeacher().getId().equals(teacher.getId()))
                .map(a -> a.getCourse().getName())
                .findFirst().orElse("-");
            return new TeacherClassCourseDto(classe.getId(), classe.getNom(), courseName);
        }).toList();
    }
}
