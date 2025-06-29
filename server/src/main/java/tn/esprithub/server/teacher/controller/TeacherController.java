package tn.esprithub.server.teacher.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.esprithub.server.academic.entity.Classe;
import tn.esprithub.server.project.entity.Project;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.academic.repository.ClasseRepository;
import tn.esprithub.server.project.repository.ProjectRepository;
import tn.esprithub.server.teacher.dto.TeacherClassCourseDto;
import tn.esprithub.server.teacher.service.TeacherClassCourseService;

import java.util.List;

@RestController
@RequestMapping("/api/teacher")
public class TeacherController {
    private final ClasseRepository classeRepository;
    private final ProjectRepository projectRepository;
    private final TeacherClassCourseService teacherClassCourseService;

    public TeacherController(ClasseRepository classeRepository, ProjectRepository projectRepository, TeacherClassCourseService teacherClassCourseService) {
        this.classeRepository = classeRepository;
        this.projectRepository = projectRepository;
        this.teacherClassCourseService = teacherClassCourseService;
    }

    @GetMapping("/classes")
    public ResponseEntity<List<Classe>> getMyClasses(@AuthenticationPrincipal User currentUser) {
        // Return classes where the teacher is assigned
        List<Classe> classes = classeRepository.findByTeachers_Id(currentUser.getId());
        return ResponseEntity.ok(classes);
    }

    @GetMapping("/projects")
    public ResponseEntity<List<Project>> getMyProjects(@AuthenticationPrincipal User currentUser) {
        // Return projects where the teacher is creator or collaborator
        List<Project> projects = projectRepository.findByCreatedBy_IdOrCollaborators_Id(currentUser.getId(), currentUser.getId());
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/classes-with-courses")
    public ResponseEntity<List<TeacherClassCourseDto>> getMyClassesWithCourses(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(teacherClassCourseService.getClassesWithCourses(currentUser));
    }
}
