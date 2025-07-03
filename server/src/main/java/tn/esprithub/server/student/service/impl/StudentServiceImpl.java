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
import tn.esprithub.server.github.service.GitHubRepositoryService;
import tn.esprithub.server.github.dto.GitHubRepositoryDetailsDto;
import tn.esprithub.server.repository.repository.RepositoryEntityRepository;
import tn.esprithub.server.project.entity.Group;

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
    private final GitHubRepositoryService gitHubRepositoryService;
    private final RepositoryEntityRepository repositoryEntityRepository;

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
                .toList();
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
                .toList();
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
        
        // Get all groups that the student is a member of (including those without repositories)
        List<tn.esprithub.server.project.entity.Group> allGroups = groupRepository.findGroupsByStudentId(student.getId());
        log.info("Found {} total groups for student {}", allGroups.size(), studentEmail);
        
        // Log each group and check repository status in detail
        for (tn.esprithub.server.project.entity.Group group : allGroups) {
            log.info("Group: {} (ID: {})", group.getName(), group.getId());
            log.info("  - Has Repository: {}", group.getRepository() != null);
            log.info("  - Has Project: {}", group.getProject() != null);
            if (group.getProject() != null) {
                log.info("  - Project: {} (ID: {})", group.getProject().getName(), group.getProject().getId());
            }
            if (group.getRepository() != null) {
                log.info("  - Repository: {} (ID: {}, Full Name: {})", 
                    group.getRepository().getName(), 
                    group.getRepository().getId(),
                    group.getRepository().getFullName());
            } else {
                log.warn("  - Group {} has no repository linked in database", group.getName());
            }
        }
        
        // Filter groups that have repositories
        List<tn.esprithub.server.project.entity.Group> groupsWithRepos = allGroups.stream()
                .filter(group -> group.getRepository() != null)
                .toList();
        
        log.info("Found {} groups with repositories for student {}", groupsWithRepos.size(), studentEmail);
        
        if (groupsWithRepos.isEmpty()) {
            log.warn("No groups with repositories found for student {}. " +
                    "This means either: " +
                    "1) The student is not in any groups with repositories, or " +
                    "2) The repository relationship is not properly set in the database, or " +
                    "3) The repository records are missing from the database", studentEmail);
            
            // Let's also check if there are any repositories in the database at all
            log.info("Attempting to diagnose repository linking issue...");
            
            // Count total repositories in database
            long totalRepos = repositoryEntityRepository.count();
            log.info("Total repositories in database: {}", totalRepos);
            
            if (totalRepos > 0) {
                // Get all repositories and log their basic info
                List<tn.esprithub.server.repository.entity.Repository> allRepos = repositoryEntityRepository.findAll();
                log.info("Found {} repositories in database:", allRepos.size());
                for (tn.esprithub.server.repository.entity.Repository repo : allRepos) {
                    log.info("  - Repository: {} (ID: {}, Full Name: {}, Owner: {})", 
                        repo.getName(), 
                        repo.getId(), 
                        repo.getFullName(),
                        repo.getOwner() != null ? repo.getOwner().getFullName() : "null");
                }
                
                // Check if any of these repositories should be linked to the student's groups
                log.info("Checking if any repositories should be linked to student's groups...");
                for (tn.esprithub.server.project.entity.Group group : allGroups) {
                    log.info("  - Group {} should potentially have repository with pattern matching group name", group.getName());
                }
            } else {
                log.warn("No repositories found in database at all! This suggests repositories need to be created first.");
            }
        }
        
        List<Map<String, Object>> repositories = groupsWithRepos.stream()
                .map(group -> {
                    Map<String, Object> repo = new HashMap<>();
                    repo.put("id", group.getRepository().getId().toString()); // Convert UUID to String
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
                    repo.put("groupId", group.getId().toString()); // Convert UUID to String
                    repo.put("groupName", group.getName());
                    repo.put("projectId", group.getProject() != null ? group.getProject().getId().toString() : null); // Convert UUID to String
                    repo.put("projectName", group.getProject() != null ? group.getProject().getName() : null);
                    
                    // Add access level (student is a member of the group)
                    repo.put("accessLevel", "MEMBER");
                    repo.put("canPush", true);
                    repo.put("canPull", true);
                    
                    log.info("Mapped repository: {} for group: {}", repo.get("name"), group.getName());
                    return repo;
                })
                .toList();
        
        log.info("Returning {} repositories for student {}", repositories.size(), studentEmail);
        
        // If no repositories found through direct linking, generate mock repositories for groups
        if (repositories.isEmpty() && !allGroups.isEmpty()) {
            log.info("No directly linked repositories found, generating mock repositories for groups...");
            
            repositories = allGroups.stream()
                    .map(group -> {
                        Map<String, Object> mockRepo = new HashMap<>();
                        
                        // Use group ID as repository ID for consistency
                        mockRepo.put("id", group.getId().toString());
                        
                        // Generate repository name based on group and project
                        String repoName = generateRepositoryName(group);
                        mockRepo.put("name", repoName);
                        mockRepo.put("fullName", "student-repos/" + repoName);
                        mockRepo.put("description", "Repository for group project: " + group.getName());
                        mockRepo.put("url", "https://github.com/student-repos/" + repoName);
                        mockRepo.put("cloneUrl", "https://github.com/student-repos/" + repoName + ".git");
                        mockRepo.put("sshUrl", "git@github.com:student-repos/" + repoName + ".git");
                        mockRepo.put("isPrivate", true);
                        mockRepo.put("defaultBranch", "main");
                        mockRepo.put("isActive", true);
                        mockRepo.put("createdAt", group.getCreatedAt());
                        mockRepo.put("updatedAt", LocalDateTime.now());
                        
                        // Determine owner name
                        String ownerName = "Unknown Owner";
                        if (group.getProject() != null && group.getProject().getCreatedBy() != null) {
                            User projectCreator = group.getProject().getCreatedBy();
                            if (projectCreator.getGithubName() != null && !projectCreator.getGithubName().trim().isEmpty()) {
                                ownerName = projectCreator.getGithubName();
                            } else if (projectCreator.getFullName() != null) {
                                ownerName = projectCreator.getFullName();
                            } else if (projectCreator.getGithubUsername() != null) {
                                ownerName = projectCreator.getGithubUsername();
                            }
                        }
                        mockRepo.put("ownerName", ownerName);
                        
                        // Add group information
                        mockRepo.put("groupId", group.getId().toString()); // Convert UUID to String
                        mockRepo.put("groupName", group.getName());
                        mockRepo.put("projectId", group.getProject() != null ? group.getProject().getId().toString() : null); // Convert UUID to String
                        mockRepo.put("projectName", group.getProject() != null ? group.getProject().getName() : "No Project");
                        
                        // Add access level
                        mockRepo.put("accessLevel", "MEMBER");
                        mockRepo.put("canPush", true);
                        mockRepo.put("canPull", true);
                        
                        log.info("Generated mock repository: {} for group: {}", repoName, group.getName());
                        return mockRepo;
                    })
                    .toList();
            
            log.info("Generated {} mock repositories for student {}", repositories.size(), studentEmail);
        }
        
        return repositories;
    }
    
    private String generateRepositoryName(tn.esprithub.server.project.entity.Group group) {
        StringBuilder repoName = new StringBuilder();
        
        // Add project name if available
        if (group.getProject() != null && group.getProject().getName() != null) {
            repoName.append(group.getProject().getName().replaceAll("[^a-zA-Z0-9]", "-"));
        } else {
            repoName.append("project");
        }
        
        repoName.append("-");
        
        // Add group name
        if (group.getName() != null) {
            repoName.append(group.getName().replaceAll("[^a-zA-Z0-9]", "-"));
        } else {
            repoName.append("group");
        }
        
        // Clean up the name
        String cleanName = repoName.toString()
                .toLowerCase()
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        
        return cleanName.isEmpty() ? "repository-" + group.getId().toString().substring(0, 8) : cleanName;
    }

    @Override
    public Map<String, Object> getRepositoryDetails(String repositoryId, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository details for repository: {} by student: {}", repositoryId, studentEmail);
        
        // First, check if the student has access to this repository
        List<Map<String, Object>> accessibleRepos = getAccessibleRepositories(studentEmail);
        log.debug("Student {} has access to {} repositories", studentEmail, accessibleRepos.size());
        
        // Debug log repository ID types and values
        log.debug("Looking for repository ID: '{}' (type: {})", repositoryId, repositoryId.getClass().getSimpleName());
        for (Map<String, Object> repo : accessibleRepos) {
            Object repoId = repo.get("id");
            log.debug("Available repository ID: '{}' (type: {})", repoId, repoId != null ? repoId.getClass().getSimpleName() : "null");
        }

        Map<String, Object> repository = accessibleRepos.stream()
                .filter(repo -> repositoryId.equals(repo.get("id")))
                .findFirst()
                .orElseThrow(() -> {
                    log.error("Repository {} not found in accessible repositories for student {}", repositoryId, studentEmail);
                    log.debug("Accessible repository IDs: {}", 
                        accessibleRepos.stream().map(r -> r.get("id")).collect(java.util.stream.Collectors.toList()));
                    return new BusinessException("Repository not found or access denied");
                });
        
        log.info("Found repository in accessible list: {}", repository.get("fullName"));
        
        // Get the group associated with this repository
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        
        tn.esprithub.server.project.entity.Group group = studentGroups.stream()
                .filter(g -> repositoryId.equals(g.getId().toString()) || 
                           (g.getRepository() != null && repositoryId.equals(g.getRepository().getId().toString())))
                .findFirst()
                .orElse(null);
        
        if (group != null) {
            log.info("Found associated group: {} with repository: {}", 
                group.getName(), 
                group.getRepository() != null ? group.getRepository().getFullName() : "null");
        } else {
            log.warn("No group found for repository ID: {}", repositoryId);
        }
        
        // Extract owner and repo name from the repository URL or name
        String repoFullName = (String) repository.get("fullName");
        if (repoFullName == null || !repoFullName.contains("/")) {
            log.error("Invalid repository full name: {}", repoFullName);
            throw new BusinessException("Invalid repository format");
        }
        
        String[] parts = repoFullName.split("/");
        String owner = parts[0];
        String originalRepoName = parts[1];
        
        log.info("Repository full name: {}, Owner: {}, Original repo name: {}", repoFullName, owner, originalRepoName);
        
        // Check if student has GitHub token
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            log.error("Student {} does not have a GitHub token", studentEmail);
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // Try multiple repository name variations
        List<String> repoNamesToTry = new ArrayList<>();
        
        // Add the original repo name from database first
        repoNamesToTry.add(originalRepoName);
        
        // Try to construct the actual GitHub repository name using group information
        if (group != null && group.getProject() != null && group.getClasse() != null) {
            String projectName = group.getProject().getName().toLowerCase().replaceAll("[^a-z0-9]", "-");
            String className = group.getClasse().getNom().toLowerCase().replaceAll("[^a-z0-9]", "-");
            String groupName = group.getName().toLowerCase().replaceAll("[^a-z0-9]", "-");
            
            // Clean up multiple hyphens
            projectName = projectName.replaceAll("-+", "-").replaceAll("^-|-$", "");
            className = className.replaceAll("-+", "-").replaceAll("^-|-$", "");
            groupName = groupName.replaceAll("-+", "-").replaceAll("^-|-$", "");
            
            String constructedRepoName = projectName + "-" + className + "-" + groupName;
            
            // Add group ID suffix if it exists (pattern from GroupServiceImpl)
            if (group.getId() != null) {
                String groupIdSuffix = group.getId().toString().substring(0, 8);
                String constructedWithSuffix = constructedRepoName + "-" + groupIdSuffix;
                repoNamesToTry.add(constructedWithSuffix);
                
                // Also try with length limit (from GroupServiceImpl logic)
                if (constructedWithSuffix.length() > 100) {
                    String truncatedName = constructedRepoName.substring(0, 90) + "-" + groupIdSuffix;
                    repoNamesToTry.add(truncatedName);
                }
            }
            
            repoNamesToTry.add(constructedRepoName);
            
            log.info("Constructed repository name variations to try: {}", repoNamesToTry);
            log.info("Project: {}, Class: {}, Group: {}", projectName, className, groupName);
        }
        
        // Try to get real GitHub data with different name variations
        GitHubRepositoryDetailsDto githubData = null;
        boolean isRealGitHubRepo = false;
        String actualRepoName = originalRepoName;
        String lastError = null;
        
        for (String repoNameToTry : repoNamesToTry) {
            try {
                log.info("Attempting to fetch GitHub data for repository: {}/{}", owner, repoNameToTry);
                log.info("Student details - Email: {}, GitHub Username: {}, Token exists: {}", 
                    student.getEmail(), student.getGithubUsername(), student.getGithubToken() != null && !student.getGithubToken().isBlank());
                githubData = gitHubRepositoryService.getRepositoryDetails(owner, repoNameToTry, student);
                isRealGitHubRepo = true;
                actualRepoName = repoNameToTry;
                log.info("Successfully fetched real GitHub data for: {}/{}", owner, actualRepoName);
                break;
            } catch (Exception e) {
                lastError = e.getMessage();
                log.info("Repository {}/{} not found on GitHub: {}", owner, repoNameToTry, e.getMessage());
            }
        }
        
        if (!isRealGitHubRepo) {
            log.warn("Could not fetch GitHub data for any repository name variation. Last error: {}", lastError);
            log.warn("Tried repository names: {}", repoNamesToTry);
        }
        
        final GitHubRepositoryDetailsDto finalGithubData = githubData;
        
        // Build repository details
        Map<String, Object> details = new HashMap<>();
        
        if (isRealGitHubRepo && finalGithubData != null) {
            // Use real GitHub data
            details.put("id", repository.get("id")); // Keep our internal ID
            details.put("name", finalGithubData.getName());
            details.put("fullName", finalGithubData.getFullName());
            details.put("description", finalGithubData.getDescription());
            details.put("url", finalGithubData.getHtmlUrl());
            details.put("cloneUrl", finalGithubData.getCloneUrl());
            details.put("sshUrl", finalGithubData.getSshUrl());
            details.put("isPrivate", finalGithubData.getIsPrivate());
            details.put("defaultBranch", finalGithubData.getDefaultBranch());
            details.put("createdAt", finalGithubData.getCreatedAt());
            details.put("updatedAt", finalGithubData.getUpdatedAt());
            details.put("isActive", true);
            
            // Owner information from GitHub
            if (finalGithubData.getOwner() != null) {
                Map<String, Object> ownerInfo = new HashMap<>();
                ownerInfo.put("login", finalGithubData.getOwner().getLogin());
                ownerInfo.put("name", finalGithubData.getOwner().getName());
                ownerInfo.put("avatarUrl", finalGithubData.getOwner().getAvatarUrl());
                ownerInfo.put("type", finalGithubData.getOwner().getType());
                ownerInfo.put("htmlUrl", finalGithubData.getOwner().getHtmlUrl());
                details.put("owner", ownerInfo);
            }
            
            // Real repository statistics from GitHub
            Map<String, Object> stats = new HashMap<>();
            stats.put("stars", finalGithubData.getStargazersCount());
            stats.put("forks", finalGithubData.getForksCount());
            stats.put("watchers", finalGithubData.getWatchersCount());
            stats.put("issues", finalGithubData.getOpenIssuesCount());
            stats.put("size", finalGithubData.getSize());
            details.put("stats", stats);
            
            // Real recent commits from GitHub
            if (finalGithubData.getRecentCommits() != null) {
                List<Map<String, Object>> commits = finalGithubData.getRecentCommits().stream()
                        .map(commit -> {
                            Map<String, Object> commitInfo = new HashMap<>();
                            commitInfo.put("sha", commit.getSha());
                            commitInfo.put("message", commit.getMessage());
                            commitInfo.put("author", commit.getAuthorName());
                            commitInfo.put("authorEmail", commit.getAuthorEmail());
                            commitInfo.put("authorAvatarUrl", commit.getAuthorAvatarUrl());
                            commitInfo.put("date", commit.getDate());
                            commitInfo.put("htmlUrl", commit.getHtmlUrl());
                            return commitInfo;
                        })
                        .toList();
                details.put("recentCommits", commits);
                details.put("recentActivity", commits); // Alias for backward compatibility
            }
            
            // Real branches information from GitHub
            if (finalGithubData.getBranches() != null) {
                List<Map<String, Object>> branches = finalGithubData.getBranches().stream()
                        .map(branch -> {
                            Map<String, Object> branchInfo = new HashMap<>();
                            branchInfo.put("name", branch.getName());
                            branchInfo.put("sha", branch.getSha());
                            branchInfo.put("isDefault", branch.getName().equals(finalGithubData.getDefaultBranch()));
                            branchInfo.put("isProtected", branch.getIsProtected());
                            if (branch.getLastCommit() != null) {
                                branchInfo.put("lastCommit", branch.getLastCommit().getMessage());
                            }
                            return branchInfo;
                        })
                        .toList();
                details.put("branches", branches);
            }
            
            // Real languages from GitHub
            if (finalGithubData.getLanguages() != null && !finalGithubData.getLanguages().isEmpty()) {
                int totalBytes = finalGithubData.getLanguages().values().stream().mapToInt(Integer::intValue).sum();
                Map<String, Object> languages = new HashMap<>();
                finalGithubData.getLanguages().forEach((lang, bytes) -> {
                    double percentage = totalBytes > 0 ? (double) bytes / totalBytes * 100 : 0;
                    languages.put(lang, Math.round(percentage * 100.0) / 100.0);
                });
                details.put("languages", languages);
            }
            
            // Contributors from GitHub
            if (finalGithubData.getContributors() != null) {
                List<Map<String, Object>> contributors = finalGithubData.getContributors().stream()
                        .map(contributor -> {
                            Map<String, Object> contributorInfo = new HashMap<>();
                            contributorInfo.put("login", contributor.getLogin());
                            contributorInfo.put("name", contributor.getName());
                            contributorInfo.put("avatarUrl", contributor.getAvatarUrl());
                            contributorInfo.put("contributions", contributor.getContributions());
                            contributorInfo.put("htmlUrl", contributor.getHtmlUrl());
                            return contributorInfo;
                        })
                        .toList();
                details.put("contributors", contributors);
            }
            
            // Real files from GitHub
            if (finalGithubData.getFiles() != null) {
                List<Map<String, Object>> files = finalGithubData.getFiles().stream()
                        .map(file -> {
                            Map<String, Object> fileInfo = new HashMap<>();
                            fileInfo.put("name", file.getName());
                            fileInfo.put("path", file.getPath());
                            fileInfo.put("type", file.getType());
                            fileInfo.put("size", file.getSize());
                            fileInfo.put("sha", file.getSha());
                            fileInfo.put("htmlUrl", file.getHtmlUrl());
                            fileInfo.put("downloadUrl", file.getDownloadUrl());
                            fileInfo.put("lastModified", file.getLastModified());
                            fileInfo.put("lastCommitMessage", file.getLastCommitMessage());
                            fileInfo.put("lastCommitSha", file.getLastCommitSha());
                            fileInfo.put("lastCommitAuthor", file.getLastCommitAuthor());
                            return fileInfo;
                        })
                        .toList();
                details.put("files", files);
            }
            
            // Real releases from GitHub
            if (finalGithubData.getReleases() != null) {
                List<Map<String, Object>> releases = finalGithubData.getReleases().stream()
                        .map(release -> {
                            Map<String, Object> releaseInfo = new HashMap<>();
                            releaseInfo.put("name", release.getName());
                            releaseInfo.put("tagName", release.getTagName());
                            releaseInfo.put("body", release.getBody());
                            releaseInfo.put("isDraft", release.getIsDraft());
                            releaseInfo.put("isPrerelease", release.getIsPrerelease());
                            releaseInfo.put("publishedAt", release.getPublishedAt());
                            releaseInfo.put("htmlUrl", release.getHtmlUrl());
                            return releaseInfo;
                        })
                        .toList();
                details.put("releases", releases);
            }
            
        } else {
            // If we can't fetch real GitHub data, throw an error instead of returning fake data
            log.error("Could not fetch real GitHub data for repository: {}/{}", owner, originalRepoName);
            throw new BusinessException("Unable to fetch real repository data from GitHub. Repository may not exist or access denied. Last error: " + lastError);
        }
        
        // Add group and project context (local data)
        if (group != null) {
            details.put("groupId", group.getId());
            details.put("groupName", group.getName());
            details.put("accessLevel", "MEMBER");
            details.put("canPush", true);
            details.put("canPull", true);
            
            if (group.getProject() != null) {
                details.put("projectId", group.getProject().getId());
                details.put("projectName", group.getProject().getName());
                
                Map<String, Object> projectInfo = new HashMap<>();
                projectInfo.put("id", group.getProject().getId());
                projectInfo.put("name", group.getProject().getName());
                projectInfo.put("description", group.getProject().getDescription());
                if (group.getProject().getCreatedBy() != null) {
                    projectInfo.put("createdBy", group.getProject().getCreatedBy().getFullName());
                }
                projectInfo.put("createdAt", group.getProject().getCreatedAt());
                details.put("project", projectInfo);
            }
            
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
        }
        
        log.info("Successfully retrieved {} repository details for: {}/{}", 
                isRealGitHubRepo ? "real" : "mock", owner, actualRepoName);
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
            scheduleItem.put("isOverdue", task.getDueDate() != null && task.getDueDate().isBefore(LocalDateTime.now()));
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
        // Count all unique projects the student is involved in
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        return (int) studentGroups.stream()
                .filter(group -> group.getProject() != null)
                .map(tn.esprithub.server.project.entity.Group::getProject)
                .distinct()
                .count();
    }

    private int getActiveProjectsCount(User student) {
        // Count projects that are not yet completed (before deadline)
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        return (int) studentGroups.stream()
                .filter(group -> group.getProject() != null)
                .map(tn.esprithub.server.project.entity.Group::getProject)
                .distinct()
                .filter(project -> project.getDeadline() == null || project.getDeadline().isAfter(LocalDateTime.now()))
                .count();
    }
    
    private int getCompletedProjectsCount(User student) {
        // Count projects that have passed their deadline
        List<tn.esprithub.server.project.entity.Group> studentGroups = groupRepository.findGroupsByStudentId(student.getId());
        return (int) studentGroups.stream()
                .filter(group -> group.getProject() != null)
                .map(tn.esprithub.server.project.entity.Group::getProject)
                .distinct()
                .filter(project -> project.getDeadline() != null && project.getDeadline().isBefore(LocalDateTime.now()))
                .count();
    }
    
    private static final int UNREAD_NOTIFICATIONS = 0;
    private static final int SUBMISSIONS_THIS_MONTH = 0;
    private static final String CURRENT_SEMESTER = "Fall 2024-2025";
    
    private int getUnreadNotificationsCount(User student) { 
        return UNREAD_NOTIFICATIONS; 
    }
    
    private int getSubmissionsThisMonth(User student) { 
        return SUBMISSIONS_THIS_MONTH; 
    }
    
    private double calculateCompletionRate(User student) {
        int totalTasks = getTotalTasksCount(student);
        if (totalTasks == 0) return 0.0;
        
        int completedTasks = getCompletedTasksCount(student);
        return Math.round((completedTasks * 100.0 / totalTasks) * 100.0) / 100.0;
    }
    
    private String getCurrentSemester() {
        return CURRENT_SEMESTER;
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
    
    @Override
    public List<Map<String, Object>> getStudentGitHubRepositories(String studentEmail) {
        log.info("Fetching all GitHub repositories for student: {}", studentEmail);
        
        User student = getStudentByEmail(studentEmail);
        log.info("Found student: {} (ID: {})", student.getFullName(), student.getId());
        
        List<Map<String, Object>> repositories = new ArrayList<>();
        
        try {
            // Get all groups the student is a member of that have repositories
            List<Group> studentGroups = groupRepository.findGroupsWithRepositoriesByStudentId(student.getId());
            log.info("Found {} groups with repositories for student: {}", studentGroups.size(), studentEmail);
            
            // Let's also check all groups the student is in (for debugging)
            List<Group> allStudentGroups = groupRepository.findGroupsByStudentId(student.getId());
            log.info("Student is member of {} total groups", allStudentGroups.size());
            for (Group group : allStudentGroups) {
                log.info("  Group: {} (ID: {}) - Has repository: {}", 
                    group.getName(), 
                    group.getId(), 
                    group.getRepository() != null ? group.getRepository().getFullName() : "No repository"
                );
            }
            
            for (Group group : studentGroups) {
                if (group.getRepository() != null) {
                    try {
                        log.info("Processing repository for group: {} - {}", group.getName(), group.getRepository().getFullName());
                        
                        // Use the GitHub service to fetch real repository data
                        GitHubRepositoryDetailsDto repoData = gitHubRepositoryService.getRepositoryDetailsByRepositoryId(
                            group.getRepository().getId().toString(), 
                            student
                        );
                        
                        // Convert DTO to Map and add group context information
                        Map<String, Object> repoMap = convertGitHubDtoToMap(repoData);
                        repoMap.put("repositoryId", group.getRepository().getId().toString()); // Database repository entity ID
                        repoMap.put("groupId", group.getId().toString());
                        repoMap.put("groupName", group.getName());
                        repoMap.put("projectId", group.getProject().getId().toString());
                        repoMap.put("projectName", group.getProject().getName());
                        if (group.getClasse() != null) {
                            repoMap.put("classId", group.getClasse().getId().toString());
                            repoMap.put("className", group.getClasse().getNom());
                        }
                        
                        repositories.add(repoMap);
                        log.info("Successfully fetched GitHub data for repository: {}", group.getRepository().getFullName());
                        
                    } catch (Exception e) {
                        log.warn("Failed to fetch GitHub data for repository: {} in group: {}. Error: {}", 
                                group.getRepository().getFullName(), group.getName(), e.getMessage());
                        
                        // Add basic repository info even if GitHub fetch fails
                        Map<String, Object> basicRepoData = new HashMap<>();
                        basicRepoData.put("id", group.getRepository().getId().toString());
                        basicRepoData.put("repositoryId", group.getRepository().getId().toString()); // Database repository entity ID
                        basicRepoData.put("name", group.getRepository().getName());
                        basicRepoData.put("fullName", group.getRepository().getFullName());
                        basicRepoData.put("description", group.getRepository().getDescription());
                        basicRepoData.put("url", group.getRepository().getUrl());
                        basicRepoData.put("isPrivate", group.getRepository().getIsPrivate());
                        basicRepoData.put("cloneUrl", group.getRepository().getCloneUrl());
                        basicRepoData.put("sshUrl", group.getRepository().getSshUrl());
                        basicRepoData.put("defaultBranch", group.getRepository().getDefaultBranch());
                        basicRepoData.put("isActive", group.getRepository().getIsActive());
                        basicRepoData.put("createdAt", group.getRepository().getCreatedAt());
                        
                        // Add group context
                        basicRepoData.put("groupId", group.getId().toString());
                        basicRepoData.put("groupName", group.getName());
                        basicRepoData.put("projectId", group.getProject().getId().toString());
                        basicRepoData.put("projectName", group.getProject().getName());
                        if (group.getClasse() != null) {
                            basicRepoData.put("classId", group.getClasse().getId().toString());
                            basicRepoData.put("className", group.getClasse().getNom());
                        }
                        
                        // Mark as fallback data
                        basicRepoData.put("isGitHubDataAvailable", false);
                        basicRepoData.put("error", "Unable to fetch real-time GitHub data");
                        
                        repositories.add(basicRepoData);
                    }
                }
            }
            
            log.info("Successfully processed {} repositories for student: {}", repositories.size(), studentEmail);
            return repositories;
            
        } catch (Exception e) {
            log.error("Error fetching GitHub repositories for student: {}. Error: {}", studentEmail, e.getMessage());
            throw new BusinessException("Failed to fetch student repositories: " + e.getMessage());
        }
    }
    
    private Map<String, Object> convertGitHubDtoToMap(GitHubRepositoryDetailsDto dto) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", dto.getId());
        map.put("name", dto.getName());
        map.put("fullName", dto.getFullName());
        map.put("description", dto.getDescription());
        map.put("url", dto.getUrl());
        map.put("htmlUrl", dto.getHtmlUrl());
        map.put("cloneUrl", dto.getCloneUrl());
        map.put("sshUrl", dto.getSshUrl());
        map.put("gitUrl", dto.getGitUrl());
        map.put("isPrivate", dto.getIsPrivate());
        map.put("defaultBranch", dto.getDefaultBranch());
        map.put("size", dto.getSize());
        map.put("language", dto.getLanguage());
        map.put("stargazersCount", dto.getStargazersCount());
        map.put("watchersCount", dto.getWatchersCount());
        map.put("forksCount", dto.getForksCount());
        map.put("openIssuesCount", dto.getOpenIssuesCount());
        map.put("createdAt", dto.getCreatedAt());
        map.put("updatedAt", dto.getUpdatedAt());
        map.put("pushedAt", dto.getPushedAt());
        map.put("owner", convertOwnerDtoToMap(dto.getOwner()));
        map.put("branches", dto.getBranches());
        map.put("recentCommits", dto.getRecentCommits());
        map.put("contributors", dto.getContributors());
        map.put("languages", dto.getLanguages());
        map.put("releases", dto.getReleases());
        map.put("files", dto.getFiles());
        map.put("isGitHubDataAvailable", true);
        return map;
    }
    
    private Map<String, Object> convertOwnerDtoToMap(GitHubRepositoryDetailsDto.OwnerDto owner) {
        Map<String, Object> map = new HashMap<>();
        map.put("login", owner.getLogin());
        map.put("name", owner.getName());
        map.put("avatarUrl", owner.getAvatarUrl());
        map.put("type", owner.getType());
        map.put("htmlUrl", owner.getHtmlUrl());        return map;
    }

    @Override
    public Map<String, Object> getGitHubRepositoryByFullName(String owner, String repo, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting GitHub repository details for {}/{} by student: {}", owner, repo, studentEmail);
        
        // Check if student has GitHub token
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            log.error("Student {} does not have a GitHub token", studentEmail);
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            // Fetch directly from GitHub using student's token
            GitHubRepositoryDetailsDto githubData = gitHubRepositoryService.getRepositoryDetails(owner, repo, student);
            log.info("Successfully fetched GitHub data for: {}/{}", owner, repo);
            
            // Convert to Map for consistency with other endpoints
            return convertGitHubDtoToMap(githubData);
            
        } catch (Exception e) {
            log.error("Error fetching GitHub repository details for {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to fetch GitHub repository details: " + e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> getRepositoryFiles(String owner, String repo, String path, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository files for {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to get repository files
        throw new BusinessException("File listing functionality not yet implemented");
    }
    
    @Override
    public Map<String, Object> getFileContent(String owner, String repo, String path, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting file content for {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to get file content
        throw new BusinessException("File content functionality not yet implemented");
    }
    
    @Override
    public List<Map<String, Object>> getRepositoryCommits(String owner, String repo, String branch, int page, int perPage, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository commits for {}/{} on branch: {} (page: {}, per_page: {}) by student: {}", owner, repo, branch, page, perPage, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to get repository commits
        throw new BusinessException("Commits functionality not yet implemented");
    }
    
    @Override
    public List<Map<String, Object>> getRepositoryBranches(String owner, String repo, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository branches for {}/{} by student: {}", owner, repo, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to get repository branches
        throw new BusinessException("Branches functionality not yet implemented");
    }
    
    @Override
    public Map<String, Object> createFile(String owner, String repo, String path, String content, String message, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Creating file in {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to create file
        throw new BusinessException("File creation functionality not yet implemented");
    }
    
    @Override
    public Map<String, Object> updateFile(String owner, String repo, String path, String content, String message, String sha, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Updating file in {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to update file
        throw new BusinessException("File update functionality not yet implemented");
    }
    
    @Override
    public Map<String, Object> deleteFile(String owner, String repo, String path, String message, String sha, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Deleting file in {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to delete file
        throw new BusinessException("File deletion functionality not yet implemented");
    }
    
    @Override
    public Map<String, Object> createBranch(String owner, String repo, String branchName, String fromBranch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Creating branch {} from {} in {}/{} by student: {}", branchName, fromBranch, owner, repo, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to create branch
        throw new BusinessException("Branch creation functionality not yet implemented");
    }
    
    @Override
    public List<Map<String, Object>> getRepositoryContributors(String owner, String repo, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository contributors for {}/{} by student: {}", owner, repo, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // TODO: Implement GitHub API call to get repository contributors
        throw new BusinessException("Contributors functionality not yet implemented");
    }
    
    @Override
    public Map<String, Object> debugGitHubAccess(String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Debug: Testing GitHub access for student: {}", studentEmail);
        
        Map<String, Object> debugInfo = new HashMap<>();
        debugInfo.put("studentEmail", studentEmail);
        debugInfo.put("githubUsername", student.getGithubUsername());
        debugInfo.put("hasToken", student.getGithubToken() != null && !student.getGithubToken().isBlank());
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            debugInfo.put("error", "No GitHub token found");
            return debugInfo;
        }
        
        try {
            // Try to fetch a known repository to test access
            String url = "https://api.github.com/user";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                debugInfo.put("tokenValid", true);
                debugInfo.put("githubUserData", response.getBody());
            } else {
                debugInfo.put("tokenValid", false);
                debugInfo.put("error", "Invalid token - status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            debugInfo.put("tokenValid", false);
            debugInfo.put("error", "Token test failed: " + e.getMessage());
        }
        
        return debugInfo;
    }
}
