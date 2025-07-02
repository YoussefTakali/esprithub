package tn.esprithub.server.student.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tn.esprithub.server.common.exception.BusinessException;
import tn.esprithub.server.project.entity.Task;
import tn.esprithub.server.project.enums.TaskStatus;
import tn.esprithub.server.project.repository.TaskRepository;
import tn.esprithub.server.project.repository.GroupRepository;
import tn.esprithub.server.student.dto.StudentDashboardDto;
import tn.esprithub.server.student.dto.StudentTaskDto;
import tn.esprithub.server.student.dto.StudentGroupDto;
import tn.esprithub.server.student.dto.StudentProjectDto;
import tn.esprithub.server.student.service.StudentService;
import tn.esprithub.server.user.entity.User;
import tn.esprithub.server.user.repository.UserRepository;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceImpl implements StudentService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final GroupRepository groupRepository;

    @Override
    public StudentDashboardDto getStudentDashboard(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        return StudentDashboardDto.builder()
                .studentName(student.getFullName())
                .studentEmail(student.getEmail())
                .className(student.getClasse() != null ? student.getClasse().getNom() : "No Class")
                .departmentName(student.getClasse() != null && student.getClasse().getNiveau() != null 
                    ? student.getClasse().getNiveau().getDepartement().getNom() : "No Department")
                .levelName(student.getClasse() != null && student.getClasse().getNiveau() != null 
                    ? student.getClasse().getNiveau().getNom() : "No Level")
                .totalTasks(getTotalTasksCount(student))
                .pendingTasks(getPendingTasksCount(student))
                .completedTasks(getCompletedTasksCount(student))
                .overdueTasks(getOverdueTasksCount(student))
                .totalProjects(getTotalProjectsCount(student))
                .activeProjects(getActiveProjectsCount(student))
                .completedProjects(getCompletedProjectsCount(student))
                .totalGroups(getTotalGroupsCount(student))
                .activeGroups(getActiveGroupsCount(student))
                .recentActivities(getRecentActivitiesForDashboard(student))
                .upcomingDeadlines(getUpcomingDeadlinesForDashboard(student))
                .weeklyTasks(getWeeklyTasksForDashboard(student))
                .taskStatusCounts(getTaskStatusCounts(student))
                .projectStatusCounts(getProjectStatusCounts(student))
                .unreadNotifications(getUnreadNotificationsCount(student))
                .recentNotifications(getRecentNotificationsForDashboard(student))
                .completionRate(calculateCompletionRate(student))
                .submissionsThisMonth(getSubmissionsThisMonth(student))
                .currentSemester(getCurrentSemester())
                .build();
    }

    @Override
    public Page<StudentTaskDto> getStudentTasks(String studentEmail, Pageable pageable, String status, String search) {
        User student = getStudentByEmail(studentEmail);
        
        List<StudentTaskDto> tasks = getTasksForStudent(student, status, search);
        
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), tasks.size());
        List<StudentTaskDto> pageContent = tasks.subList(start, end);
        
        return new PageImpl<>(pageContent, pageable, tasks.size());
    }

    @Override
    public StudentTaskDto getTaskDetails(UUID taskId, String studentEmail) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("Task not found"));
        
        return convertToStudentTaskDto(task);
    }

    @Override
    public void submitTask(UUID taskId, String studentEmail, String notes) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        
        // Validate that task exists
        taskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("Task not found"));
        
        // TODO: Implement actual submission logic
        log.info("Task {} submitted by student {} with notes: {}", taskId, studentEmail, notes);
    }

    @Override
    public List<StudentGroupDto> getStudentGroups(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        List<tn.esprithub.server.project.entity.Group> groups = groupRepository.findGroupsByStudentId(student.getId());
        
        return groups.stream()
                .map(group -> StudentGroupDto.builder()
                        .id(group.getId())
                        .name(group.getName())
                        .projectId(group.getProject() != null ? group.getProject().getId() : null)
                        .projectName(group.getProject() != null ? group.getProject().getName() : "No Project")
                        .classId(group.getClasse() != null ? group.getClasse().getId() : null)
                        .className(group.getClasse() != null ? group.getClasse().getNom() : "No Class")
                        .totalMembers(group.getStudents() != null ? group.getStudents().size() : 0)
                        .repositoryName(group.getRepository() != null ? group.getRepository().getName() : null)
                        .repositoryUrl(group.getRepository() != null ? group.getRepository().getCloneUrl() : null)
                        .hasRepository(group.getRepository() != null)
                        .createdAt(group.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public StudentGroupDto getGroupDetails(UUID groupId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        tn.esprithub.server.project.entity.Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException("Group not found"));
        
        if (!group.getStudents().contains(student)) {
            throw new BusinessException("Student is not a member of this group");
        }
        
        return StudentGroupDto.builder()
                .id(group.getId())
                .name(group.getName())
                .projectId(group.getProject() != null ? group.getProject().getId() : null)
                .projectName(group.getProject() != null ? group.getProject().getName() : "No Project")
                .classId(group.getClasse() != null ? group.getClasse().getId() : null)
                .className(group.getClasse() != null ? group.getClasse().getNom() : "No Class")
                .totalMembers(group.getStudents() != null ? group.getStudents().size() : 0)
                .repositoryName(group.getRepository() != null ? group.getRepository().getName() : null)
                .repositoryUrl(group.getRepository() != null ? group.getRepository().getCloneUrl() : null)
                .hasRepository(group.getRepository() != null)
                .createdAt(group.getCreatedAt())
                .build();
    }

    @Override
    public List<StudentProjectDto> getStudentProjects(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        
        return studentGroups.stream()
                .filter(group -> group.getProject() != null)
                .map(group -> group.getProject())
                .distinct()
                .map(project -> StudentProjectDto.builder()
                        .id(project.getId())
                        .name(project.getName())
                        .description(project.getDescription())
                        .deadline(project.getDeadline())
                        .isOverdue(project.getDeadline() != null && project.getDeadline().isBefore(LocalDateTime.now()))
                        .teacherName(project.getCreatedBy() != null ? project.getCreatedBy().getFullName() : "Unknown")
                        .teacherId(project.getCreatedBy() != null ? project.getCreatedBy().getId() : null)
                        .totalTasks(project.getTasks() != null ? project.getTasks().size() : 0)
                        .createdAt(project.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public StudentProjectDto getProjectDetails(UUID projectId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // Find project through student's groups
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        
        tn.esprithub.server.project.entity.Project project = studentGroups.stream()
                .filter(group -> group.getProject() != null && group.getProject().getId().equals(projectId))
                .map(group -> group.getProject())
                .findFirst()
                .orElseThrow(() -> new BusinessException("Project not found or student is not part of this project"));
        
        return StudentProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .deadline(project.getDeadline())
                .isOverdue(project.getDeadline() != null && project.getDeadline().isBefore(LocalDateTime.now()))
                .teacherName(project.getCreatedBy() != null ? project.getCreatedBy().getFullName() : "Unknown")
                .teacherId(project.getCreatedBy() != null ? project.getCreatedBy().getId() : null)
                .totalTasks(project.getTasks() != null ? project.getTasks().size() : 0)
                .createdAt(project.getCreatedAt())
                .build();
    }

    @Override
    public Map<String, Object> getStudentProfile(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", student.getId());
        profile.put("firstName", student.getFirstName());
        profile.put("lastName", student.getLastName());
        profile.put("email", student.getEmail());
        profile.put("fullName", student.getFullName());
        profile.put("role", student.getRole());
        profile.put("isActive", student.getIsActive());
        profile.put("isEmailVerified", student.getIsEmailVerified());
        profile.put("lastLogin", student.getLastLogin());
        profile.put("className", student.getClasse() != null ? student.getClasse().getNom() : null);
        profile.put("departmentName", student.getClasse() != null && student.getClasse().getNiveau() != null 
            ? student.getClasse().getNiveau().getDepartement().getNom() : null);
        profile.put("levelName", student.getClasse() != null && student.getClasse().getNiveau() != null 
            ? student.getClasse().getNiveau().getNom() : null);
        profile.put("githubUsername", student.getGithubUsername());
        
        return profile;
    }

    @Override
    public List<Map<String, Object>> getNotifications(String studentEmail, boolean unreadOnly) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        
        List<Map<String, Object>> notifications = new ArrayList<>();
        
        Map<String, Object> notification = new HashMap<>();
        notification.put("id", UUID.randomUUID());
        notification.put("title", "New Task Assigned");
        notification.put("message", "You have been assigned a new task: Complete Project Setup");
        notification.put("type", "INFO");
        notification.put("timestamp", LocalDateTime.now().minusHours(2));
        notification.put("isRead", false);
        notification.put("actionUrl", "/student/tasks");
        notifications.add(notification);
        
        return notifications;
    }

    @Override
    public void markNotificationAsRead(UUID notificationId, String studentEmail) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        log.info("Notification {} marked as read by student {}", notificationId, studentEmail);
    }

    @Override
    public List<Map<String, Object>> getUpcomingDeadlines(String studentEmail, int days) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        
        List<Map<String, Object>> deadlines = new ArrayList<>();
        
        Map<String, Object> deadline = new HashMap<>();
        deadline.put("id", UUID.randomUUID());
        deadline.put("title", "Project Submission");
        deadline.put("type", "PROJECT");
        deadline.put("deadline", LocalDateTime.now().plusDays(3));
        deadline.put("daysLeft", 3);
        deadline.put("priority", "HIGH");
        deadline.put("status", "PENDING");
        deadlines.add(deadline);
        
        return deadlines;
    }

    @Override
    public Page<Map<String, Object>> getSubmissions(String studentEmail, Pageable pageable) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        
        List<Map<String, Object>> submissions = new ArrayList<>();
        return new PageImpl<>(submissions, pageable, 0);
    }

    @Override
    public List<Map<String, Object>> getAccessibleRepositories(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repositories for student: {} (ID: {})", studentEmail, student.getId());
        
        // Get all groups with repositories that the student is a member of
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsWithRepositoriesByStudentId(student.getId());
        log.info("Found {} groups for student {}", studentGroups.size(), studentEmail);
        
        // Log each group and whether it has a repository
        for (tn.esprithub.server.project.entity.Group group : studentGroups) {
            log.info("Group: {} (ID: {}), Has Repository: {}", 
                group.getName(), group.getId(), group.getRepository() != null);
            
            // Log the raw repository_id from the database to debug the issue
            try {
                // Use reflection to access the repository_id field directly if available
                log.info("Group {} - Repository object: {}", group.getName(), group.getRepository());
                
                // Try to access repository ID through database query
                log.info("Checking database for group {} repository_id...", group.getName());
                
            } catch (Exception e) {
                log.error("Error checking repository for group {}: {}", group.getName(), e.getMessage());
            }
            
            if (group.getRepository() != null) {
                log.info("Repository details - Name: {}, ID: {}", 
                    group.getRepository().getName(), group.getRepository().getId());
            }
        }
        
        List<Map<String, Object>> repositories = studentGroups.stream()
                .filter(group -> {
                    boolean hasRepo = group.getRepository() != null;
                    log.info("Filtering group {} - has repository: {}", group.getName(), hasRepo);
                    return hasRepo;
                }) // Only groups with repositories
                .map(group -> {
                    Map<String, Object> repo = new HashMap<>();
                    repo.put("id", group.getRepository().getId());
                    repo.put("name", group.getRepository().getName());
                    repo.put("fullName", group.getRepository().getFullName());
                    repo.put("description", group.getRepository().getDescription());
                    repo.put("url", group.getRepository().getUrl());
                    repo.put("cloneUrl", group.getRepository().getCloneUrl());
                    repo.put("sshUrl", group.getRepository().getSshUrl());
                    repo.put("isPrivate", group.getRepository().getIsPrivate());
                    repo.put("defaultBranch", group.getRepository().getDefaultBranch());
                    repo.put("isActive", group.getRepository().getIsActive());
                    repo.put("createdAt", group.getRepository().getCreatedAt());
                    repo.put("updatedAt", group.getRepository().getUpdatedAt());
                    repo.put("ownerName", group.getRepository().getOwner() != null ? 
                        group.getRepository().getOwner().getFullName() : "Unknown");
                    
                    // Add group information
                    repo.put("groupId", group.getId());
                    repo.put("groupName", group.getName());
                    repo.put("projectId", group.getProject() != null ? group.getProject().getId() : null);
                    repo.put("projectName", group.getProject() != null ? group.getProject().getName() : null);
                    
                    // Add access level (student is a member of the group)
                    repo.put("accessLevel", "MEMBER");
                    repo.put("canPush", true);
                    repo.put("canPull", true);
                    
                    return repo;
                })
                .collect(Collectors.toList()); // Use collect to get a mutable list
        
        // If no repositories found through direct linking, try to find repositories by name matching
        if (repositories.isEmpty()) {
            log.info("No directly linked repositories found, trying to find by name matching...");
            
            // Get all groups (without repository constraint) that the student is member of
            List<tn.esprithub.server.project.entity.Group> allStudentGroups = groupRepository.findGroupsByStudentId(student.getId());
            
            for (tn.esprithub.server.project.entity.Group group : allStudentGroups) {
                log.info("Checking group: {} for name-based repository matching", group.getName());
                
                // Try to find a repository that contains the group name
                // This is a temporary workaround for the broken linking
                Map<String, Object> mockRepo = new HashMap<>();
                mockRepo.put("id", group.getId().toString()); // Use group ID as consistent repository ID
                mockRepo.put("name", "Nora-Matthews-Harper-Hebert-" + group.getName());
                mockRepo.put("fullName", "aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName());
                mockRepo.put("description", "Repository for group project: Nora Matthews-Harper Hebert-" + group.getName());
                mockRepo.put("url", "https://github.com/aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName());
                mockRepo.put("cloneUrl", "https://github.com/aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName() + ".git");
                mockRepo.put("sshUrl", "git@github.com:aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName() + ".git");
                mockRepo.put("isPrivate", true);
                mockRepo.put("defaultBranch", "main");
                mockRepo.put("isActive", true);
                mockRepo.put("createdAt", LocalDateTime.now());
                mockRepo.put("updatedAt", LocalDateTime.now());
                // Get the project creator (teacher) to determine the actual repository owner
                User projectCreator = group.getProject() != null ? group.getProject().getCreatedBy() : null;
                String ownerName = "Unknown Owner";
                
                if (projectCreator != null) {
                    // Try to get GitHub name first, fall back to full name, then username
                    if (projectCreator.getGithubName() != null && !projectCreator.getGithubName().trim().isEmpty()) {
                        ownerName = projectCreator.getGithubName();
                    } else if (projectCreator.getFirstName() != null && projectCreator.getLastName() != null) {
                        ownerName = projectCreator.getFirstName() + " " + projectCreator.getLastName();
                    } else if (projectCreator.getGithubUsername() != null && !projectCreator.getGithubUsername().trim().isEmpty()) {
                        ownerName = projectCreator.getGithubUsername();
                    }
                }
                
                mockRepo.put("ownerName", ownerName);
                
                // Add group information
                mockRepo.put("groupId", group.getId());
                mockRepo.put("groupName", group.getName());
                mockRepo.put("projectId", group.getProject() != null ? group.getProject().getId() : null);
                mockRepo.put("projectName", group.getProject() != null ? group.getProject().getName() : "No Project");
                
                // Add access level
                mockRepo.put("accessLevel", "MEMBER");
                mockRepo.put("canPush", true);
                mockRepo.put("canPull", true);
                
                repositories.add(mockRepo);
                log.info("Added mock repository for group: {}", group.getName());
            }
        }
        
        log.info("Returning {} repositories for student {}", repositories.size(), studentEmail);
        return repositories;
    }

    @Override
    public Map<String, Object> getRepositoryDetails(String repositoryId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository details for repository: {} by student: {}", repositoryId, studentEmail);
        
        // First, check if the student has access to this repository
        List<Map<String, Object>> accessibleRepos = getAccessibleRepositories(studentEmail);
        log.info("Found {} accessible repositories for student {}", accessibleRepos.size(), studentEmail);
        
        // Log all repository IDs for debugging
        for (Map<String, Object> repo : accessibleRepos) {
            log.info("Available repository ID: {}, name: {}", repo.get("id"), repo.get("name"));
        }
        
        Map<String, Object> repository = accessibleRepos.stream()
                .filter(repo -> repositoryId.equals(repo.get("id")))
                .findFirst()
                .orElseGet(() -> {
                    log.warn("Repository with ID {} not found in accessible repositories for student {}. Attempting to find by group ID.", repositoryId, studentEmail);
                    
                    // Try to find a group with this ID and create a mock repository
                    List<tn.esprithub.server.project.entity.Group> allGroups = groupRepository.findGroupsByStudentId(student.getId());
                    for (tn.esprithub.server.project.entity.Group group : allGroups) {
                        if (repositoryId.equals(group.getId().toString())) {
                            log.info("Found matching group {} for repository ID {}", group.getName(), repositoryId);
                            
                            Map<String, Object> mockRepo = new HashMap<>();
                            mockRepo.put("id", group.getId().toString());
                            mockRepo.put("name", "Nora-Matthews-Harper-Hebert-" + group.getName());
                            mockRepo.put("fullName", "aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName());
                            mockRepo.put("description", "Repository for group project: " + group.getName());
                            mockRepo.put("url", "https://github.com/aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName());
                            mockRepo.put("cloneUrl", "https://github.com/aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName() + ".git");
                            mockRepo.put("sshUrl", "git@github.com:aichabnr001/Nora-Matthews-Harper-Hebert-" + group.getName() + ".git");
                            mockRepo.put("isPrivate", true);
                            mockRepo.put("defaultBranch", "main");
                            mockRepo.put("isActive", true);
                            mockRepo.put("createdAt", LocalDateTime.now());
                            mockRepo.put("updatedAt", LocalDateTime.now());
                            
                            // Add group and project information
                            mockRepo.put("groupId", group.getId());
                            mockRepo.put("groupName", group.getName());
                            mockRepo.put("projectId", group.getProject() != null ? group.getProject().getId() : null);
                            mockRepo.put("projectName", group.getProject() != null ? group.getProject().getName() : "No Project");
                            mockRepo.put("accessLevel", "MEMBER");
                            mockRepo.put("canPush", true);
                            mockRepo.put("canPull", true);
                            
                            return mockRepo;
                        }
                    }
                    
                    log.error("Repository with ID {} not found for student {}", repositoryId, studentEmail);
                    throw new BusinessException("Repository not found or access denied");
                });
        
        // Get the group associated with this repository
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        log.info("Found {} groups for student {}", studentGroups.size(), studentEmail);
        
        tn.esprithub.server.project.entity.Group group = studentGroups.stream()
                .filter(g -> {
                    boolean matches = repositoryId.equals(g.getId().toString()) || 
                                    (repository.get("name") != null && repository.get("name").toString().contains(g.getName()));
                    log.info("Checking group {} (ID: {}), matches: {}", g.getName(), g.getId(), matches);
                    return matches;
                })
                .findFirst()
                .orElse(null);
        
        log.info("Selected group: {}", group != null ? group.getName() : "none");
        
        // Build enhanced repository details
        Map<String, Object> details = new HashMap<>(repository);
        
        if (group != null && group.getProject() != null && group.getProject().getCreatedBy() != null) {
            User projectCreator = group.getProject().getCreatedBy();
            
            // Enhanced owner information
            Map<String, Object> ownerInfo = new HashMap<>();
            ownerInfo.put("login", projectCreator.getGithubUsername());
            ownerInfo.put("name", projectCreator.getGithubName() != null ? projectCreator.getGithubName() : projectCreator.getFullName());
            ownerInfo.put("email", projectCreator.getEmail());
            ownerInfo.put("fullName", projectCreator.getFullName());
            ownerInfo.put("avatarUrl", "https://github.com/" + projectCreator.getGithubUsername() + ".png");
            details.put("owner", ownerInfo);
            
            // Group members information
            List<Map<String, Object>> members = group.getStudents().stream()
                    .map(member -> {
                        Map<String, Object> memberInfo = new HashMap<>();
                        memberInfo.put("id", member.getId());
                        memberInfo.put("name", member.getFullName());
                        memberInfo.put("email", member.getEmail());
                        memberInfo.put("githubUsername", member.getGithubUsername());
                        memberInfo.put("githubName", member.getGithubName());
                        return memberInfo;
                    })
                    .toList();
            details.put("groupMembers", members);
            
            // Project information
            Map<String, Object> projectInfo = new HashMap<>();
            projectInfo.put("id", group.getProject().getId());
            projectInfo.put("name", group.getProject().getName());
            projectInfo.put("description", group.getProject().getDescription());
            projectInfo.put("createdBy", projectCreator.getFullName());
            projectInfo.put("createdAt", group.getProject().getCreatedAt());
            details.put("project", projectInfo);
        }
        
        // Additional repository statistics (mock for now)
        Map<String, Object> stats = new HashMap<>();
        stats.put("commits", 15);
        stats.put("branches", 3);
        stats.put("contributors", group != null ? group.getStudents().size() + 1 : 1);
        stats.put("issues", 2);
        stats.put("pullRequests", 1);
        details.put("stats", stats);
        
        // Recent activity (mock)
        List<Map<String, Object>> recentActivity = List.of(
                Map.of("type", "commit", "message", "Initial project setup", "author", details.get("ownerName"), "date", LocalDateTime.now().minusDays(2)),
                Map.of("type", "commit", "message", "Add README.md", "author", details.get("ownerName"), "date", LocalDateTime.now().minusDays(1))
        );
        details.put("recentActivity", recentActivity);
        
        // Branches information (mock)
        List<Map<String, Object>> branches = List.of(
                Map.of("name", "main", "isDefault", true, "lastCommit", "Initial commit"),
                Map.of("name", "develop", "isDefault", false, "lastCommit", "Add new features"),
                Map.of("name", "feature/auth", "isDefault", false, "lastCommit", "Implement authentication")
        );
        details.put("branches", branches);
        
        // Languages used (mock)
        Map<String, Object> languages = Map.of(
                "Java", 65,
                "JavaScript", 20,
                "HTML", 10,
                "CSS", 5
        );
        details.put("languages", languages);
        
        log.info("Retrieved detailed repository information for repository: {}", repositoryId);
        return details;
    }

    @Override
    public Map<String, Object> getAcademicProgress(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        Map<String, Object> progress = new HashMap<>();
        
        // Get task statistics
        List<Task> directTasks = taskRepository.findByAssignedToStudents_Id(student.getId());
        List<Task> groupTasks = taskRepository.findTasksAssignedToStudentGroups(student.getId());
        List<Task> classTasks = taskRepository.findTasksAssignedToStudentClass(student.getId());
        
        Set<Task> allTasks = new HashSet<>();
        allTasks.addAll(directTasks);
        allTasks.addAll(groupTasks);
        allTasks.addAll(classTasks);
        
        int totalTasks = allTasks.size();
        int completedTasks = getCompletedTasksCount(student);
        int overdueTasks = getOverdueTasksCount(student);
        
        progress.put("totalTasks", totalTasks);
        progress.put("completedTasks", completedTasks);
        progress.put("overdueTasks", overdueTasks);
        progress.put("completionRate", totalTasks > 0 ? (double) completedTasks / totalTasks * 100 : 0.0);
        
        // Get project statistics
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        int totalProjects = (int) studentGroups.stream()
                .filter(group -> group.getProject() != null)
                .map(group -> group.getProject())
                .distinct()
                .count();
        
        progress.put("totalProjects", totalProjects);
        progress.put("activeProjects", getActiveProjectsCount(student));
        progress.put("completedProjects", getCompletedProjectsCount(student));
        
        // Add grade/performance indicators (mock data for now)
        progress.put("averageGrade", 85.5);
        progress.put("attendance", 92.3);
        progress.put("participationScore", 88.0);
        
        return progress;
    }

    @Override
    public List<Map<String, Object>> getWeeklySchedule(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        List<Map<String, Object>> schedule = new ArrayList<>();
        
        // Get upcoming tasks for the week
        LocalDateTime startOfWeek = LocalDateTime.now().with(DayOfWeek.MONDAY).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfWeek = startOfWeek.plusDays(7);
        
        List<Task> directTasks = taskRepository.findByAssignedToStudents_Id(student.getId());
        List<Task> groupTasks = taskRepository.findTasksAssignedToStudentGroups(student.getId());
        List<Task> classTasks = taskRepository.findTasksAssignedToStudentClass(student.getId());
        
        Set<Task> allTasks = new HashSet<>();
        allTasks.addAll(directTasks);
        allTasks.addAll(groupTasks);
        allTasks.addAll(classTasks);
        
        // Filter tasks with deadlines within the week
        List<Task> weeklyTasks = allTasks.stream()
                .filter(task -> task.getDueDate() != null)
                .filter(task -> task.getDueDate().isAfter(startOfWeek) && task.getDueDate().isBefore(endOfWeek))
                .sorted(Comparator.comparing(Task::getDueDate))
                .toList();
        
        for (Task task : weeklyTasks) {
            Map<String, Object> scheduleItem = new HashMap<>();
            scheduleItem.put("id", task.getId());
            scheduleItem.put("type", "TASK");
            scheduleItem.put("title", task.getTitle());
            scheduleItem.put("description", task.getDescription());
            scheduleItem.put("deadline", task.getDueDate());
            scheduleItem.put("status", task.getStatus().toString());
            scheduleItem.put("priority", "MEDIUM"); // Default priority since Task doesn't have priority field
            scheduleItem.put("isOverdue", task.getDueDate().isBefore(LocalDateTime.now()));
            schedule.add(scheduleItem);
        }
        
        // Add project deadlines
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        for (tn.esprithub.server.project.entity.Group group : studentGroups) {
            if (group.getProject() != null && group.getProject().getDeadline() != null) {
                LocalDateTime projectDeadline = group.getProject().getDeadline();
                if (projectDeadline.isAfter(startOfWeek) && projectDeadline.isBefore(endOfWeek)) {
                    Map<String, Object> scheduleItem = new HashMap<>();
                    scheduleItem.put("id", group.getProject().getId());
                    scheduleItem.put("type", "PROJECT");
                    scheduleItem.put("title", "Project: " + group.getProject().getName());
                    scheduleItem.put("description", group.getProject().getDescription());
                    scheduleItem.put("deadline", projectDeadline);
                    scheduleItem.put("status", "ACTIVE");
                    scheduleItem.put("priority", "HIGH");
                    scheduleItem.put("isOverdue", projectDeadline.isBefore(LocalDateTime.now()));
                    schedule.add(scheduleItem);
                }
            }
        }
        
        // Sort by deadline
        schedule.sort((a, b) -> {
            LocalDateTime deadlineA = (LocalDateTime) a.get("deadline");
            LocalDateTime deadlineB = (LocalDateTime) b.get("deadline");
            return deadlineA.compareTo(deadlineB);
        });
        
        return schedule;
    }

    // Private helper methods
    private User getStudentByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Student not found with email: " + email));
    }

    private List<StudentTaskDto> getTasksForStudent(User student, String status, String search) {
        List<Task> allTasks = getAllTasksForStudent(student);
        
        if (StringUtils.hasText(status)) {
            TaskStatus taskStatus = TaskStatus.valueOf(status.toUpperCase());
            allTasks = allTasks.stream()
                    .filter(task -> task.getStatus() == taskStatus)
                    .collect(Collectors.toList());
        }
        
        if (StringUtils.hasText(search)) {
            String searchLower = search.toLowerCase();
            allTasks = allTasks.stream()
                    .filter(task -> task.getTitle().toLowerCase().contains(searchLower) ||
                                  (task.getDescription() != null && task.getDescription().toLowerCase().contains(searchLower)))
                    .collect(Collectors.toList());
        }
        
        return allTasks.stream()
                .map(this::convertToStudentTaskDto)
                .collect(Collectors.toList());
    }

    private List<Task> getAllTasksForStudent(User student) {
        List<Task> allTasks = new ArrayList<>();
        
        // Get tasks assigned directly to the student
        List<Task> directTasks = taskRepository.findByAssignedToStudents_Id(student.getId());
        allTasks.addAll(directTasks);
        
        // Get tasks assigned to groups that the student is a member of
        List<Task> groupTasks = taskRepository.findTasksAssignedToStudentGroups(student.getId());
        allTasks.addAll(groupTasks);
        
        // Get tasks assigned to the student's class
        List<Task> classTasks = taskRepository.findTasksAssignedToStudentClass(student.getId());
        allTasks.addAll(classTasks);
        
        return allTasks.stream()
                .distinct()
                .filter(Task::isVisible)
                .sorted((a, b) -> {
                    if (a.getDueDate() == null && b.getDueDate() == null) return 0;
                    if (a.getDueDate() == null) return 1;
                    if (b.getDueDate() == null) return -1;
                    return a.getDueDate().compareTo(b.getDueDate());
                })
                .collect(Collectors.toList());
    }
    
    private StudentTaskDto convertToStudentTaskDto(Task task) {
        String frontendType = "INDIVIDUAL";
        if (task.getType() == tn.esprithub.server.project.enums.TaskAssignmentType.GROUP) {
            frontendType = "GROUP";
        } else if (task.getType() == tn.esprithub.server.project.enums.TaskAssignmentType.CLASSE || 
                   task.getType() == tn.esprithub.server.project.enums.TaskAssignmentType.PROJECT) {
            frontendType = "CLASS";
        }
        
        return StudentTaskDto.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .assignmentType(task.getType())
                .type(frontendType)
                .status(task.getStatus())
                .dueDate(task.getDueDate())
                .isGraded(task.isGraded())
                .isVisible(task.isVisible())
                .isOverdue(task.getDueDate() != null && task.getDueDate().isBefore(LocalDateTime.now()))
                .assignedTo(frontendType)
                .projectName(task.getProjects() != null && !task.getProjects().isEmpty() ? 
                    task.getProjects().get(0).getName() : null)
                .projectId(task.getProjects() != null && !task.getProjects().isEmpty() ? 
                    task.getProjects().get(0).getId() : null)
                .daysLeft(task.getDueDate() != null ? 
                    (int) ChronoUnit.DAYS.between(LocalDateTime.now(), task.getDueDate()) : 0)
                .urgencyLevel(calculateUrgencyLevel(task))
                .canSubmit(task.getStatus() != TaskStatus.COMPLETED)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
    
    private String calculateUrgencyLevel(Task task) {
        if (task.getDueDate() == null) return "LOW";
        
        long daysUntilDue = ChronoUnit.DAYS.between(LocalDateTime.now(), task.getDueDate());
        if (daysUntilDue < 0) return "HIGH";
        if (daysUntilDue <= 2) return "HIGH";
        if (daysUntilDue <= 7) return "MEDIUM";
        return "LOW";
    }

    // Dashboard stats methods
    private int getTotalTasksCount(User student) { 
        return getAllTasksForStudent(student).size();
    }
    
    private int getPendingTasksCount(User student) { 
        return (int) getAllTasksForStudent(student).stream()
                .filter(task -> task.getStatus() == TaskStatus.PUBLISHED || task.getStatus() == TaskStatus.DRAFT)
                .count();
    }
    
    private int getCompletedTasksCount(User student) { 
        return (int) getAllTasksForStudent(student).stream()
                .filter(task -> task.getStatus() == TaskStatus.COMPLETED)
                .count();
    }
    
    private int getOverdueTasksCount(User student) { 
        return (int) getAllTasksForStudent(student).stream()
                .filter(task -> task.getDueDate() != null && 
                               task.getDueDate().isBefore(LocalDateTime.now()) && 
                               task.getStatus() != TaskStatus.COMPLETED)
                .count();
    }
    
    private int getTotalGroupsCount(User student) {
        return groupRepository.findGroupsByStudentId(student.getId()).size();
    }

    private int getActiveGroupsCount(User student) {
        return groupRepository.findGroupsByStudentId(student.getId()).size();
    }

    private int getTotalProjectsCount(User student) { 
        return 3; // Mock data
    }
    
    private int getActiveProjectsCount(User student) { 
        return 2; // Mock data
    }
    
    private int getCompletedProjectsCount(User student) { 
        return 1; // Mock data
    }
    
    private int getUnreadNotificationsCount(User student) { 
        return 0; 
    }
    
    private int getSubmissionsThisMonth(User student) { 
        return 0; 
    }
    
    private double calculateCompletionRate(User student) {
        int totalTasks = getTotalTasksCount(student);
        if (totalTasks == 0) return 0.0;
        
        int completedTasks = getCompletedTasksCount(student);
        return Math.round((completedTasks * 100.0 / totalTasks) * 100.0) / 100.0;
    }
    
    private String getCurrentSemester() {
        return "Fall 2024-2025";
    }

    private List<StudentDashboardDto.RecentActivityDto> getRecentActivitiesForDashboard(User student) {
        return new ArrayList<>();
    }

    private List<StudentDashboardDto.UpcomingDeadlineDto> getUpcomingDeadlinesForDashboard(User student) {
        return new ArrayList<>();
    }

    private List<StudentDashboardDto.WeeklyTaskDto> getWeeklyTasksForDashboard(User student) {
        return new ArrayList<>();
    }

    private Map<String, Integer> getTaskStatusCounts(User student) {
        Map<String, Integer> counts = new HashMap<>();
        List<Task> allTasks = getAllTasksForStudent(student);
        
        counts.put("PUBLISHED", (int) allTasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.PUBLISHED).count());
        counts.put("IN_PROGRESS", (int) allTasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.IN_PROGRESS).count());
        counts.put("COMPLETED", getCompletedTasksCount(student));
        counts.put("OVERDUE", getOverdueTasksCount(student));
        return counts;
    }

    private Map<String, Integer> getProjectStatusCounts(User student) {
        Map<String, Integer> counts = new HashMap<>();
        counts.put("ACTIVE", getActiveProjectsCount(student));
        counts.put("COMPLETED", getCompletedProjectsCount(student));
        return counts;
    }

    private List<StudentDashboardDto.NotificationDto> getRecentNotificationsForDashboard(User student) {
        return new ArrayList<>();
    }

    @Override
    public List<Map<String, Object>> getRecentActivities(String studentEmail, int limit) {
        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        List<Map<String, Object>> activities = new ArrayList<>();
        
        // Add task-related activities
        List<Task> directTasks = taskRepository.findByAssignedToStudents_Id(student.getId());
        List<Task> groupTasks = taskRepository.findTasksAssignedToStudentGroups(student.getId());
        List<Task> classTasks = taskRepository.findTasksAssignedToStudentClass(student.getId());
        
        // Combine all tasks and sort by creation date
        Set<Task> allTasks = new HashSet<>();
        allTasks.addAll(directTasks);
        allTasks.addAll(groupTasks);
        allTasks.addAll(classTasks);
        
        List<Task> recentTasks = allTasks.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(limit)
                .toList();
        
        for (Task task : recentTasks) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("id", task.getId());
            activity.put("type", "TASK");
            activity.put("title", "Task: " + task.getTitle());
            activity.put("description", task.getDescription());
            activity.put("timestamp", task.getCreatedAt());
            activity.put("status", task.getStatus().toString());
            activities.add(activity);
        }
        
        return activities;
    }
}
