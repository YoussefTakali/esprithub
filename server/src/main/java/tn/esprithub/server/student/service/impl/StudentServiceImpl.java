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
        
        // Build comprehensive dashboard data
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
        
        // Get tasks assigned to student (individual, group, or class)
        List<StudentTaskDto> tasks = getTasksForStudent(student, status, search);
        
        // Apply pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), tasks.size());
        List<StudentTaskDto> pageContent = tasks.subList(start, end);
        
        return new PageImpl<>(pageContent, pageable, tasks.size());
    }

    @Override
    public StudentTaskDto getTaskDetails(UUID taskId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement task details retrieval
        // This would involve querying the Task entity and converting to DTO
        throw new BusinessException("Task details not yet implemented");
    }

    @Override
    public void submitTask(UUID taskId, String studentEmail, String notes) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement task submission logic
        // This would involve updating task status and creating submission record
        log.info("Task {} submitted by student {} with notes: {}", taskId, studentEmail, notes);
    }

    @Override
    public List<StudentGroupDto> getStudentGroups(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement groups retrieval
        // This would involve querying groups where student is a member
        return new ArrayList<>();
    }

    @Override
    public StudentGroupDto getGroupDetails(UUID groupId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement group details retrieval
        throw new BusinessException("Group details not yet implemented");
    }

    @Override
    public List<StudentProjectDto> getStudentProjects(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement projects retrieval
        return new ArrayList<>();
    }

    @Override
    public StudentProjectDto getProjectDetails(UUID projectId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement project details retrieval
        throw new BusinessException("Project details not yet implemented");
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
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement notifications retrieval from notification system
        List<Map<String, Object>> notifications = new ArrayList<>();
        
        // Mock notification for demonstration
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
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement notification marking as read
        log.info("Notification {} marked as read by student {}", notificationId, studentEmail);
    }

    @Override
    public List<Map<String, Object>> getUpcomingDeadlines(String studentEmail, int days) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement upcoming deadlines retrieval
        List<Map<String, Object>> deadlines = new ArrayList<>();
        
        // Mock deadline for demonstration
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
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement submissions retrieval
        List<Map<String, Object>> submissions = new ArrayList<>();
        return new PageImpl<>(submissions, pageable, 0);
    }

    @Override
    public List<Map<String, Object>> getAccessibleRepositories(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement accessible repositories retrieval
        return new ArrayList<>();
    }

    @Override
    public Map<String, Object> getAcademicProgress(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        
        Map<String, Object> progress = new HashMap<>();
        progress.put("completionRate", calculateCompletionRate(student));
        progress.put("totalTasks", getTotalTasksCount(student));
        progress.put("completedTasks", getCompletedTasksCount(student));
        progress.put("currentStreak", 0); // Days of consecutive submissions
        progress.put("averageGrade", 0.0); // Average grade across all submissions
        
        return progress;
    }

    @Override
    public List<Map<String, Object>> getWeeklySchedule(String studentEmail) {
        getStudentByEmail(studentEmail); // Validate student exists
        
        // Create a mock weekly schedule for now
        List<Map<String, Object>> schedule = new ArrayList<>();
        
        // Days of the week
        String[] days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
        String[] times = {"08:00", "10:00", "14:00", "16:00"};
        String[] subjects = {"Programming", "Mathematics", "Physics", "Database Design"};
        String[] teachers = {"Dr. Smith", "Prof. Johnson", "Dr. Brown", "Prof. Davis"};
        String[] rooms = {"A101", "B205", "C301", "A102"};
        String[] types = {"COURSE", "TD", "TP", "COURSE"};
        
        // Generate schedule items
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
        User student = getStudentByEmail(studentEmail);
        
        // TODO: Implement recent activities retrieval
        return new ArrayList<>();
    }

    // Helper methods
    private User getStudentByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Student not found with email: " + email));
    }

    private List<StudentTaskDto> getTasksForStudent(User student, String status, String search) {
        // Get all tasks for the student from different sources
        List<Task> allTasks = getAllTasksForStudent(student);
        
        // Filter by status if provided
        if (StringUtils.hasText(status)) {
            TaskStatus taskStatus = TaskStatus.valueOf(status.toUpperCase());
            allTasks = allTasks.stream()
                    .filter(task -> task.getStatus() == taskStatus)
                    .collect(Collectors.toList());
        }
        
        // Filter by search term if provided
        if (StringUtils.hasText(search)) {
            String searchLower = search.toLowerCase();
            allTasks = allTasks.stream()
                    .filter(task -> task.getTitle().toLowerCase().contains(searchLower) ||
                                  (task.getDescription() != null && task.getDescription().toLowerCase().contains(searchLower)))
                    .collect(Collectors.toList());
        }
        
        // Convert to DTOs
        return allTasks.stream()
                .map(this::convertToStudentTaskDto)
                .collect(Collectors.toList());
    }
    
    private StudentTaskDto convertToStudentTaskDto(Task task) {
        // Determine assignment type for frontend compatibility
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
                .type(frontendType) // Frontend-compatible type
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
        if (daysUntilDue < 0) return "HIGH"; // Overdue
        if (daysUntilDue <= 2) return "HIGH";
        if (daysUntilDue <= 7) return "MEDIUM";
        return "LOW";
    }

    // Dashboard stats implementations using real data
    private int getTotalTasksCount(User student) { 
        return getAllTasksForStudent(student).size();
    }
    
    private int getPendingTasksCount(User student) { 
        return (int) getAllTasksForStudent(student).stream()
                .filter(task -> task.getStatus() == TaskStatus.PUBLISHED || task.getStatus() == TaskStatus.IN_PROGRESS)
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
    
    // Helper method to get all tasks for a student
    private List<Task> getAllTasksForStudent(User student) {
        List<Task> allTasks = new ArrayList<>();
        
        // 1. Tasks assigned directly to the student
        List<Task> directTasks = taskRepository.findByAssignedToStudents_Id(student.getId());
        allTasks.addAll(directTasks);
        
        // 2. Tasks assigned to groups that the student is a member of
        List<Task> groupTasks = taskRepository.findTasksAssignedToStudentGroups(student.getId());
        allTasks.addAll(groupTasks);
        
        // 3. Tasks assigned to the student's class
        if (student.getClasse() != null) {
            List<Task> classTasks = taskRepository.findByAssignedToClasses_Id(student.getClasse().getId());
            allTasks.addAll(classTasks);
        }
        
        // Remove duplicates and filter visible tasks
        return allTasks.stream()
                .distinct()
                .filter(Task::isVisible)
                .collect(Collectors.toList());
    }
    
    // Project stats - using mock data for now since we don't have project assignments
    private int getTotalProjectsCount(User student) { 
        // TODO: Implement when project assignments are available
        return 3; 
    }
    
    private int getActiveProjectsCount(User student) { 
        // TODO: Implement when project assignments are available
        return 2; 
    }
    
    private int getCompletedProjectsCount(User student) { 
        // TODO: Implement when project assignments are available
        return 1; 
    }
    
    private int getTotalGroupsCount(User student) { 
        return groupRepository.findGroupsByStudentId(student.getId()).size();
    }
    
    private int getActiveGroupsCount(User student) { 
        // For now, consider all groups as active - you can add logic to filter inactive groups
        return groupRepository.findGroupsByStudentId(student.getId()).size();
    }
    private int getUnreadNotificationsCount(User student) { return 3; }
    private int getSubmissionsThisMonth(User student) { return 5; }
    
    private double calculateCompletionRate(User student) {
        int total = getTotalTasksCount(student);
        int completed = getCompletedTasksCount(student);
        return total > 0 ? (double) completed / total * 100 : 0.0;
    }
    
    private String getCurrentSemester() {
        // TODO: Implement actual semester calculation
        return "Fall 2024-2025";
    }

    private List<StudentDashboardDto.RecentActivityDto> getRecentActivitiesForDashboard(User student) {
        // TODO: Implement actual recent activities
        return new ArrayList<>();
    }

    private List<StudentDashboardDto.UpcomingDeadlineDto> getUpcomingDeadlinesForDashboard(User student) {
        // TODO: Implement actual upcoming deadlines
        return new ArrayList<>();
    }

    private List<StudentDashboardDto.WeeklyTaskDto> getWeeklyTasksForDashboard(User student) {
        // TODO: Implement actual weekly tasks
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
        // TODO: Implement actual recent notifications
        return new ArrayList<>();
    }
}
