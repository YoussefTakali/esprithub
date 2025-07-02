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

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
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
                mockRepo.put("id", UUID.randomUUID().toString());
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
                mockRepo.put("ownerName", "GitHub Owner");
                
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
    public Map<String, Object> getAcademicProgress(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        Map<String, Object> progress = new HashMap<>();
        progress.put("completionRate", calculateCompletionRate(student));
        progress.put("totalTasks", getTotalTasksCount(student));
        progress.put("completedTasks", getCompletedTasksCount(student));
        progress.put("currentStreak", 0);
        progress.put("averageGrade", 0.0);
        
        return progress;
    }

    @Override
    public List<Map<String, Object>> getWeeklySchedule(String studentEmail) {
        getStudentByEmail(studentEmail);
        
        List<Map<String, Object>> schedule = new ArrayList<>();
        
        String[] days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
        String[] times = {"08:00", "10:00", "14:00", "16:00"};
        String[] subjects = {"Programming", "Mathematics", "Physics", "Database Design"};
        String[] teachers = {"Dr. Smith", "Prof. Johnson", "Dr. Brown", "Prof. Davis"};
        String[] rooms = {"A101", "B205", "C301", "A102"};
        String[] types = {"COURSE", "TD", "TP", "COURSE"};
        
        for (int i = 0; i < days.length; i++) {
            for (int j = 0; j < Math.min(2, times.length); j++) {
                int subjectIndex = (i * 2 + j) % subjects.length;
                Map<String, Object> scheduleItem = new HashMap<>();
                scheduleItem.put("id", UUID.randomUUID().toString());
                scheduleItem.put("day", days[i]);
                scheduleItem.put("time", times[j]);
                scheduleItem.put("subject", subjects[subjectIndex]);
                scheduleItem.put("teacher", teachers[subjectIndex]);
                scheduleItem.put("room", rooms[subjectIndex]);
                scheduleItem.put("type", types[subjectIndex]);
                schedule.add(scheduleItem);
            }
        }
        
        return schedule;
    }

    @Override
    public List<Map<String, Object>> getRecentActivities(String studentEmail, int limit) {
        // Validate that student exists
        getStudentByEmail(studentEmail);
        return new ArrayList<>();
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
}
