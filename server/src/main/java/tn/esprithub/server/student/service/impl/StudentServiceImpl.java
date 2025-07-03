package tn.esprithub.server.student.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
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
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceImpl implements StudentService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final GroupRepository groupRepository;
    private final GitHubRepositoryService gitHubRepositoryService;
    private final RepositoryEntityRepository repositoryEntityRepository;
    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();

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
                    repo.put("repositoryId", group.getRepository().getId().toString()); // Add repository ID for clarity
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
                    
                    // Add group information
                    repo.put("groupId", group.getId().toString()); // Convert UUID to String
                    repo.put("groupName", group.getName());
                    repo.put("projectId", group.getProject() != null ? group.getProject().getId().toString() : null); // Convert UUID to String
                    repo.put("projectName", group.getProject() != null ? group.getProject().getName() : null);
                    repo.put("classId", group.getClasse() != null ? group.getClasse().getId().toString() : null);
                    repo.put("className", group.getClasse() != null ? group.getClasse().getNom() : null);
                    
                    // Add access level (student is a member of the group)
                    repo.put("accessLevel", "MEMBER");
                    repo.put("canPush", true);
                    repo.put("canPull", true);
                    
                    // Try to fetch live GitHub data for this repository
                    boolean isGitHubDataAvailable = false;
                    String githubError = null;
                    
                    if (student.getGithubToken() != null && !student.getGithubToken().isBlank()) {
                        try {
                            // Extract owner and repo name from fullName
                            String fullName = group.getRepository().getFullName();
                            if (fullName != null && fullName.contains("/")) {
                                String[] parts = fullName.split("/");
                                String owner = parts[0];
                                
                                // Try multiple repository name variations (same logic as getRepositoryDetails)
                                List<String> repoNamesToTry = new ArrayList<>();
                                
                                // Get the repository name from database first
                                String databaseRepoName = parts[1]; // This is the repo name from fullName
                                log.info("Database repository name: {}", databaseRepoName);
                                
                                // First, try the exact repository name from database (it might already be correct)
                                repoNamesToTry.add(databaseRepoName);
                                
                                // Only try to construct if the database name doesn't look like the new format
                                // (new format should have group ID suffix: xxx-xxx-xxx-xxxxxxxx)
                                boolean hasGroupIdPattern = databaseRepoName.matches(".*-[a-f0-9]{8}$");
                                log.info("Database repo name '{}' has group ID pattern: {}", databaseRepoName, hasGroupIdPattern);
                                
                                // If database name doesn't have group ID pattern, try to construct the actual GitHub repository name
                                if (!hasGroupIdPattern && group.getProject() != null && group.getClasse() != null) {
                                    log.info("Constructing repository name for group: {} with project: {} and class: {}", 
                                        group.getName(), group.getProject().getName(), group.getClasse().getNom());
                                    
                                    // Use the exact same logic as GroupServiceImpl.createGroup()
                                    String baseRepoName = group.getProject().getName() + "-" + group.getClasse().getNom() + "-" + group.getName();
                                    log.info("Base repository name: {}", baseRepoName);
                                    
                                    // Clean the repository name to be GitHub-compatible (exact same logic as GroupServiceImpl)
                                    String cleanRepoName = baseRepoName
                                            .replaceAll("[^a-zA-Z0-9._-]", "-") // Replace invalid characters with hyphens
                                            .replaceAll("-+", "-") // Replace multiple consecutive hyphens with single hyphen
                                            .replaceAll("^-|-$", "") // Remove leading/trailing hyphens
                                            .toLowerCase(); // Convert to lowercase
                                    
                                    log.info("Clean repository name: {}", cleanRepoName);
                                    
                                    // Add group ID suffix (this is the current format used by GroupServiceImpl)
                                    if (group.getId() != null) {
                                        String groupIdSuffix = group.getId().toString().substring(0, 8);
                                        String constructedRepoName = cleanRepoName + "-" + groupIdSuffix;
                                        
                                        // Ensure the repository name doesn't exceed GitHub's 100 character limit (exact same logic as GroupServiceImpl)
                                        if (constructedRepoName.length() > 100) {
                                            constructedRepoName = constructedRepoName.substring(0, 90) + "-" + groupIdSuffix;
                                        }
                                        
                                        log.info("Constructed repository name with group ID suffix: {}", constructedRepoName);
                                        
                                        // Only add the constructed name if it's different from database name
                                        if (!constructedRepoName.equals(databaseRepoName)) {
                                            repoNamesToTry.add(constructedRepoName);
                                        }
                                    }
                                } else if (!hasGroupIdPattern) {
                                    log.warn("Cannot construct repository name for group {} - missing project or class information", group.getName());
                                } else {
                                    log.info("Database repository name '{}' already appears to be in correct format (has group ID pattern)", databaseRepoName);
                                }
                                 // Try to fetch GitHub data with different name variations
                                log.info("Will try {} repository name variations for group {}: {}", repoNamesToTry.size(), group.getName(), repoNamesToTry);
                                GitHubRepositoryDetailsDto githubData = null;
                                
                                // Only proceed if we have constructed repository names to try
                                if (!repoNamesToTry.isEmpty()) {
                                    for (String repoNameToTry : repoNamesToTry) {
                                        try {
                                            log.info("Attempting to fetch GitHub data for repository: {}/{} (variation {}/{})", 
                                                owner, repoNameToTry, repoNamesToTry.indexOf(repoNameToTry) + 1, repoNamesToTry.size());
                                            githubData = gitHubRepositoryService.getRepositoryDetails(owner, repoNameToTry, student);
                                            isGitHubDataAvailable = true;
                                            
                                            // Update repository info with live GitHub data
                                            if (githubData != null) {
                                                repo.put("description", githubData.getDescription());
                                                repo.put("isPrivate", githubData.getIsPrivate());
                                                repo.put("defaultBranch", githubData.getDefaultBranch());
                                                repo.put("url", githubData.getHtmlUrl());
                                                repo.put("cloneUrl", githubData.getCloneUrl());
                                                repo.put("sshUrl", githubData.getSshUrl());
                                                
                                                // Add GitHub repository ID for matching
                                                repo.put("githubId", githubData.getId());
                                                
                                                // Add GitHub statistics
                                                Map<String, Object> stats = new HashMap<>();
                                                stats.put("stars", githubData.getStargazersCount());
                                                stats.put("forks", githubData.getForksCount());
                                                stats.put("watchers", githubData.getWatchersCount());
                                                stats.put("issues", githubData.getOpenIssuesCount());
                                                stats.put("size", githubData.getSize());
                                                repo.put("stats", stats);
                                                
                                                // Add languages if available
                                                if (githubData.getLanguages() != null && !githubData.getLanguages().isEmpty()) {
                                                    int totalBytes = githubData.getLanguages().values().stream().mapToInt(Integer::intValue).sum();
                                                    Map<String, Object> languages = new HashMap<>();
                                                    githubData.getLanguages().forEach((lang, bytes) -> {
                                                        double percentage = totalBytes > 0 ? (double) bytes / totalBytes * 100 : 0;
                                                        languages.put(lang, Math.round(percentage * 100.0) / 100.0);
                                                    });
                                                    repo.put("languages", languages);
                                                }
                                                
                                                log.info("Successfully fetched GitHub data for repository: {}/{}", owner, repoNameToTry);
                                            }
                                            break; // Success, stop trying other names
                                        } catch (Exception e) {
                                            log.debug("Repository {}/{} not found on GitHub: {}", owner, repoNameToTry, e.getMessage());
                                            githubError = e.getMessage();
                                        }
                                    }
                                } else {
                                    log.warn("No repository name variations to try for group: {}", group.getName());
                                    githubError = "Cannot construct repository name - missing project or class information";
                                }
                                
                                // If no GitHub data was found with constructed names, try searching user's repositories
                                if (!isGitHubDataAvailable && !repoNamesToTry.isEmpty()) {
                                    log.info("Trying fallback search in user's repositories for group: {}", group.getName());
                                    Map<String, Object> foundRepo = searchUserRepositoriesForMatch(student, repoNamesToTry);
                                    if (foundRepo != null && !foundRepo.isEmpty()) {
                                        log.info("Found matching repository via fallback search: {}", foundRepo.get("name"));
                                        
                                        // Convert the raw GitHub API response to our expected format
                                        isGitHubDataAvailable = true;
                                        repo.put("description", foundRepo.get("description"));
                                        repo.put("isPrivate", foundRepo.get("private"));
                                        repo.put("defaultBranch", foundRepo.get("default_branch"));
                                        repo.put("url", foundRepo.get("html_url"));
                                        repo.put("cloneUrl", foundRepo.get("clone_url"));
                                        repo.put("sshUrl", foundRepo.get("ssh_url"));
                                        
                                        // Add GitHub repository ID for matching
                                        repo.put("githubId", foundRepo.get("id"));
                                        
                                        // Add basic GitHub statistics
                                        Map<String, Object> stats = new HashMap<>();
                                        stats.put("stars", foundRepo.get("stargazers_count"));
                                        stats.put("forks", foundRepo.get("forks_count"));
                                        stats.put("watchers", foundRepo.get("watchers_count"));
                                        stats.put("issues", foundRepo.get("open_issues_count"));
                                        stats.put("size", foundRepo.get("size"));
                                        repo.put("stats", stats);
                                        
                                        githubError = null; // Clear the error since we found the repo
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Failed to fetch GitHub data for repository {}: {}", group.getRepository().getFullName(), e.getMessage());
                            githubError = e.getMessage();
                        }
                    } else {
                        githubError = "GitHub token not available";
                    }
                    
                    // Add GitHub data availability indicators
                    repo.put("isGitHubDataAvailable", isGitHubDataAvailable);
                    if (githubError != null) {
                        repo.put("error", "Unable to fetch real-time GitHub data");
                        repo.put("githubError", githubError);
                    }
                    repo.put("dataSource", isGitHubDataAvailable ? "GITHUB_LIVE" : "DATABASE_ONLY");
                    
                    // Add default stats if no GitHub data available
                    if (!isGitHubDataAvailable && !repo.containsKey("stats")) {
                        Map<String, Object> defaultStats = new HashMap<>();
                        defaultStats.put("stars", 0);
                        defaultStats.put("forks", 0);
                        defaultStats.put("watchers", 0);
                        defaultStats.put("issues", 0);
                        defaultStats.put("size", 0);
                        repo.put("stats", defaultStats);
                    }
                    
                    // Add default languages if no GitHub data available
                    if (!isGitHubDataAvailable && !repo.containsKey("languages")) {
                        repo.put("languages", new HashMap<>());
                    }
                    
                    log.info("Mapped repository: {} for group: {} (GitHub data available: {})", 
                        repo.get("name"), group.getName(), isGitHubDataAvailable);
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
        
        // Check if student has GitHub token first
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            log.error("Student {} does not have a GitHub token", studentEmail);
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        // Get accessible repositories
        List<Map<String, Object>> accessibleRepos = getAccessibleRepositories(studentEmail);
        log.info("Student {} has access to {} repositories", studentEmail, accessibleRepos.size());
        
        // Enhanced debug logging for repository ID matching
        log.info("Looking for repository ID: '{}' (type: {})", repositoryId, repositoryId.getClass().getSimpleName());
        log.info("Available repositories for student {}:", studentEmail);
        for (Map<String, Object> repo : accessibleRepos) {
            Object repoId = repo.get("id");
            log.info("  - Repository ID: '{}' (type: {}), Name: '{}', FullName: '{}'", 
                repoId, 
                repoId != null ? repoId.getClass().getSimpleName() : "null",
                repo.get("name"),
                repo.get("fullName"));
        }

        // Try to find repository by UUID first, then by GitHub ID, then by fullName
        Map<String, Object> repository = null;
        
        // 1. Try exact UUID match
        repository = accessibleRepos.stream()
                .filter(repo -> repositoryId.equals(repo.get("id")))
                .findFirst()
                .orElse(null);
        
        // 2. If not found, try GitHub ID match (for numeric IDs)
        if (repository == null) {
            repository = accessibleRepos.stream()
                    .filter(repo -> repositoryId.equals(String.valueOf(repo.get("githubId"))))
                    .findFirst()
                    .orElse(null);
        }
        
        // 3. If still not found, try to match by fullName pattern (owner/repo)
        if (repository == null && repositoryId.contains("/")) {
            repository = accessibleRepos.stream()
                    .filter(repo -> repositoryId.equals(repo.get("fullName")))
                    .findFirst()
                    .orElse(null);
        }
        
        // 4. If STILL not found, just take the first accessible repository and try to fetch from GitHub
        // This is a fallback to ensure we can always try to fetch GitHub data if the student has access to any repo
        if (repository == null && !accessibleRepos.isEmpty()) {
            log.warn("Repository {} not found by ID, trying to fetch directly from GitHub using accessible repositories", repositoryId);
            
            // If the repositoryId looks like a GitHub repo full name (owner/repo), try to fetch it directly
            if (repositoryId.contains("/")) {
                String[] parts = repositoryId.split("/");
                if (parts.length == 2) {
                    String owner = parts[0];
                    String repoName = parts[1];
                    
                    // Check if student has GitHub token first
                    if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
                        log.error("Student {} does not have a GitHub token", studentEmail);
                        throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
                    }
                    
                    try {
                        log.info("Attempting direct GitHub fetch for: {}/{}", owner, repoName);
                        GitHubRepositoryDetailsDto githubData = gitHubRepositoryService.getRepositoryDetails(owner, repoName, student);
                        
                        // Create a detailed response with GitHub data
                        Map<String, Object> details = new HashMap<>();
                        details.put("id", repositoryId); // Use the provided ID
                        details.put("name", githubData.getName());
                        details.put("fullName", githubData.getFullName());
                        details.put("description", githubData.getDescription());
                        details.put("url", githubData.getHtmlUrl());
                        details.put("cloneUrl", githubData.getCloneUrl());
                        details.put("sshUrl", githubData.getSshUrl());
                        details.put("isPrivate", githubData.getIsPrivate());
                        details.put("defaultBranch", githubData.getDefaultBranch());
                        details.put("isActive", true);
                        details.put("createdAt", githubData.getCreatedAt());
                        details.put("updatedAt", githubData.getUpdatedAt());
                        
                        // Owner information from GitHub
                        if (githubData.getOwner() != null) {
                            Map<String, Object> ownerInfo = new HashMap<>();
                            ownerInfo.put("login", githubData.getOwner().getLogin());
                            ownerInfo.put("name", githubData.getOwner().getName());
                            ownerInfo.put("avatarUrl", githubData.getOwner().getAvatarUrl());
                            ownerInfo.put("type", githubData.getOwner().getType());
                            ownerInfo.put("htmlUrl", githubData.getOwner().getHtmlUrl());
                            details.put("owner", ownerInfo);
                        }
                        
                        // Repository statistics from GitHub
                        Map<String, Object> stats = new HashMap<>();
                        stats.put("stars", githubData.getStargazersCount());
                        stats.put("forks", githubData.getForksCount());
                        stats.put("watchers", githubData.getWatchersCount());
                        stats.put("issues", githubData.getOpenIssuesCount());
                        stats.put("size", githubData.getSize());
                        details.put("stats", stats);
                        
                        // Add indicators that this is live GitHub data
                        details.put("isGitHubDataAvailable", true);
                        details.put("dataSource", "GITHUB_LIVE");
                        details.put("accessLevel", "MEMBER");
                        details.put("canPush", true);
                        details.put("canPull", true);
                        
                        log.info("Successfully created synthetic repository object for GitHub repo: {}", repositoryId);
                        return details;
                        
                    } catch (Exception e) {
                        log.error("Failed to fetch GitHub data for {}: {}", repositoryId, e.getMessage());
                    }
                }
            }
        }
        
        // 5. Final fallback: if repositoryId is numeric, search user's GitHub repositories for matching ID
        if (repository == null && repositoryId.matches("\\d+")) {
            log.info("Repository not found by ID/name, trying to search user's GitHub repositories for numeric ID: {}", repositoryId);
            
            try {
                Map<String, Object> foundRepo = searchUserRepositoriesById(student, repositoryId);
                if (foundRepo != null && !foundRepo.isEmpty()) {
                    log.info("Found matching repository via GitHub ID search: {}", foundRepo.get("name"));
                    
                    // Create a detailed response with GitHub data (similar to existing fallback logic)
                    Map<String, Object> details = new HashMap<>();
                    details.put("id", repositoryId); // Use the provided GitHub ID
                    details.put("name", foundRepo.get("name"));
                    details.put("fullName", foundRepo.get("full_name"));
                    details.put("description", foundRepo.get("description"));
                    details.put("url", foundRepo.get("html_url"));
                    details.put("cloneUrl", foundRepo.get("clone_url"));
                    details.put("sshUrl", foundRepo.get("ssh_url"));
                    details.put("isPrivate", foundRepo.get("private"));
                    details.put("defaultBranch", foundRepo.get("default_branch"));
                    details.put("isActive", true);
                    details.put("createdAt", foundRepo.get("created_at"));
                    details.put("updatedAt", foundRepo.get("updated_at"));
                    details.put("githubId", foundRepo.get("id"));
                    
                    // Owner information from GitHub
                    Object ownerObj = foundRepo.get("owner");
                    if (ownerObj instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> ownerData = (Map<String, Object>) ownerObj;
                        Map<String, Object> ownerInfo = new HashMap<>();
                        ownerInfo.put("login", ownerData.get("login"));
                        ownerInfo.put("name", ownerData.get("name"));
                        ownerInfo.put("avatarUrl", ownerData.get("avatar_url"));
                        ownerInfo.put("type", ownerData.get("type"));
                        ownerInfo.put("htmlUrl", ownerData.get("html_url"));
                        details.put("owner", ownerInfo);
                    }
                    
                    // Repository statistics from GitHub
                    Map<String, Object> stats = new HashMap<>();
                    stats.put("stars", foundRepo.get("stargazers_count"));
                    stats.put("forks", foundRepo.get("forks_count"));
                    stats.put("watchers", foundRepo.get("watchers_count"));
                    stats.put("issues", foundRepo.get("open_issues_count"));
                    stats.put("size", foundRepo.get("size"));
                    details.put("stats", stats);
                    
                    // Add indicators that this is live GitHub data
                    details.put("isGitHubDataAvailable", true);
                    details.put("dataSource", "GITHUB_LIVE");
                    details.put("accessLevel", "MEMBER");
                    details.put("canPush", true);
                    details.put("canPull", true);
                    
                    log.info("Successfully created repository object from GitHub ID: {}", repositoryId);
                    return details;
                }
            } catch (Exception e) {
                log.error("Failed to search GitHub repositories by ID {}: {}", repositoryId, e.getMessage());
            }
        }
        
        if (repository == null) {
            log.error("Repository {} not found in accessible repositories for student {}", repositoryId, studentEmail);
            log.error("Accessible repository IDs: {}", 
                accessibleRepos.stream().map(r -> r.get("id")).collect(java.util.stream.Collectors.toList()));
            log.error("Accessible repositories details:");
            for (Map<String, Object> repo : accessibleRepos) {
                log.error("  - ID: {}, Name: {}, FullName: {}", 
                    repo.get("id"), repo.get("name"), repo.get("fullName"));
            }
            throw new BusinessException("Repository not found or access denied");
        }
        
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
        
        // First, try the original repo name from database (it might already be correct)
        log.info("Original repository name from database: {}", originalRepoName);
        repoNamesToTry.add(originalRepoName);
        
        // Check if database name already has group ID pattern (new format)
        boolean hasGroupIdPattern = originalRepoName.matches(".*-[a-f0-9]{8}$");
        log.info("Database repo name '{}' has group ID pattern: {}", originalRepoName, hasGroupIdPattern);
        
        // Only try to construct if database name doesn't look like the new format
        if (!hasGroupIdPattern && group != null && group.getProject() != null && group.getClasse() != null) {
            log.info("Constructing repository name using GroupServiceImpl logic for group: {} with project: {} and class: {}", 
                group.getName(), group.getProject().getName(), group.getClasse().getNom());
            
            // Use the exact same logic as GroupServiceImpl.createGroup()
            String baseRepoName = group.getProject().getName() + "-" + group.getClasse().getNom() + "-" + group.getName();
            
            // Clean the repository name to be GitHub-compatible (exact same logic as GroupServiceImpl)
            String cleanRepoName = baseRepoName
                    .replaceAll("[^a-zA-Z0-9._-]", "-") // Replace invalid characters with hyphens
                    .replaceAll("-+", "-") // Replace multiple consecutive hyphens with single hyphen
                    .replaceAll("^-|-$", "") // Remove leading/trailing hyphens
                    .toLowerCase(); // Convert to lowercase
            
            // Add group ID suffix if it exists (pattern from GroupServiceImpl)
            if (group.getId() != null) {
                String groupIdSuffix = group.getId().toString().substring(0, 8);
                String repoName = cleanRepoName + "-" + groupIdSuffix;
                
                // Ensure the repository name doesn't exceed GitHub's 100 character limit (exact same logic as GroupServiceImpl)
                if (repoName.length() > 100) {
                    repoName = repoName.substring(0, 90) + "-" + groupIdSuffix;
                }
                
                // Only add the constructed name if it's different from original database name
                if (!repoName.equals(originalRepoName)) {
                    repoNamesToTry.add(repoName);
                    log.info("Added constructed repository name: {}", repoName);
                }
                
                log.info("Constructed exact repository name using GroupServiceImpl logic: {}", repoName);
                log.info("Base name: {}, Clean name: {}, Group ID suffix: {}", baseRepoName, cleanRepoName, groupIdSuffix);
            }
            
            // Also try the clean name without suffix as fallback
            if (!cleanRepoName.equals(originalRepoName)) {
                repoNamesToTry.add(cleanRepoName);
            }
            
            log.info("Repository name variations to try: {}", repoNamesToTry);
        } else if (!hasGroupIdPattern) {
            log.warn("Cannot construct repository name for group {} - missing project or class information", 
                group != null ? group.getName() : "null");
        } else {
            log.info("Database repository name '{}' already appears to be in correct format (has group ID pattern)", originalRepoName);
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
            // If we can't fetch real GitHub data, return basic repository info from database
            log.warn("Could not fetch GitHub data for repository: {}/{}. Returning basic repository info from database.", owner, originalRepoName);
            log.warn("This is likely due to: 1) Repository is private and token doesn't have access, 2) Repository doesn't exist, or 3) Network issues");
            
            // Use basic repository information from our database
            details.put("id", repository.get("id")); // Keep our internal ID
            details.put("name", repository.get("name"));
            details.put("fullName", repository.get("fullName"));
            details.put("description", repository.get("description"));
            details.put("url", repository.get("url"));
            details.put("cloneUrl", repository.get("cloneUrl"));
            details.put("sshUrl", repository.get("sshUrl"));
            details.put("isPrivate", repository.get("isPrivate"));
            details.put("defaultBranch", repository.get("defaultBranch"));
            details.put("isActive", repository.get("isActive"));
            details.put("createdAt", repository.get("createdAt"));
            details.put("updatedAt", repository.get("updatedAt"));
            
            // Add indicators that this is not live GitHub data
            details.put("isGitHubDataAvailable", false);
            details.put("gitHubDataError", lastError);
            details.put("dataSource", "DATABASE_ONLY");
            
            // Add basic owner info if available from repository
            String ownerName = (String) repository.get("ownerName");
            if (ownerName != null) {
                Map<String, Object> ownerInfo = new HashMap<>();
                ownerInfo.put("login", owner);
                ownerInfo.put("name", ownerName);
                ownerInfo.put("type", "User");
                details.put("owner", ownerInfo);
            }
            
            // Add placeholder stats
            Map<String, Object> stats = new HashMap<>();
            stats.put("stars", 0);
            stats.put("forks", 0);
            stats.put("watchers", 0);
            stats.put("issues", 0);
            stats.put("size", 0);
            details.put("stats", stats);
            
            // Add empty arrays for GitHub-specific data
            details.put("recentCommits", new ArrayList<>());
            details.put("recentActivity", new ArrayList<>());
            details.put("branches", new ArrayList<>());
            details.put("languages", new HashMap<>());
            details.put("contributors", new ArrayList<>());
            details.put("files", new ArrayList<>());
            details.put("releases", new ArrayList<>());
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

        // Add action capabilities for frontend buttons
        Map<String, Object> capabilities = new HashMap<>();
        capabilities.put("canViewFiles", true);
        capabilities.put("canCreateFiles", true);
        capabilities.put("canEditFiles", true);
        capabilities.put("canDeleteFiles", true);
        capabilities.put("canViewCommits", true);
        capabilities.put("canViewBranches", true);
        capabilities.put("canCreateBranch", true);
        capabilities.put("canViewContributors", true);
        capabilities.put("canDownloadCode", true);
        capabilities.put("canClone", true);
        details.put("capabilities", capabilities);

        // Add GitHub API endpoints for frontend
        Map<String, String> apiEndpoints = new HashMap<>();
        String baseRepoPath = owner + "/" + actualRepoName;
        apiEndpoints.put("files", "/api/student/repositories/" + baseRepoPath + "/files");
        apiEndpoints.put("fileContent", "/api/student/repositories/" + baseRepoPath + "/files/{path}");
        apiEndpoints.put("commits", "/api/student/repositories/" + baseRepoPath + "/commits");
        apiEndpoints.put("branches", "/api/student/repositories/" + baseRepoPath + "/branches");
        apiEndpoints.put("contributors", "/api/student/repositories/" + baseRepoPath + "/contributors");
        apiEndpoints.put("createFile", "/api/student/repositories/" + baseRepoPath + "/files");
        apiEndpoints.put("updateFile", "/api/student/repositories/" + baseRepoPath + "/files/{path}");
        apiEndpoints.put("deleteFile", "/api/student/repositories/" + baseRepoPath + "/files/{path}");
        apiEndpoints.put("createBranch", "/api/student/repositories/" + baseRepoPath + "/branches");
        details.put("apiEndpoints", apiEndpoints);

        // Add repository navigation info
        Map<String, Object> navigation = new HashMap<>();
        navigation.put("owner", owner);
        navigation.put("repository", actualRepoName);
        navigation.put("fullName", owner + "/" + actualRepoName);
        navigation.put("currentBranch", isRealGitHubRepo && finalGithubData != null ? 
            finalGithubData.getDefaultBranch() : "main");
        navigation.put("currentPath", "");
        details.put("navigation", navigation);

        // Add quick actions that frontend can use
        Map<String, Object> quickActions = new HashMap<>();
        quickActions.put("browseCode", true);
        quickActions.put("viewCommitHistory", true);
        quickActions.put("manageBranches", true);
        quickActions.put("createNewFile", true);
        quickActions.put("uploadFiles", true);
        quickActions.put("viewContributors", true);
        quickActions.put("downloadZip", true);
        quickActions.put("cloneRepo", true);
        details.put("quickActions", quickActions);

        // Add repository insights
        Map<String, Object> insights = new HashMap<>();
        if (isRealGitHubRepo && finalGithubData != null) {
            insights.put("totalCommits", finalGithubData.getRecentCommits() != null ? 
                finalGithubData.getRecentCommits().size() : 0);
            insights.put("totalBranches", finalGithubData.getBranches() != null ? 
                finalGithubData.getBranches().size() : 0);
            insights.put("totalContributors", finalGithubData.getContributors() != null ? 
                finalGithubData.getContributors().size() : 0);
            insights.put("lastActivity", finalGithubData.getPushedAt());
            insights.put("primaryLanguage", finalGithubData.getLanguage());
        } else {
            insights.put("totalCommits", 0);
            insights.put("totalBranches", 0);
            insights.put("totalContributors", 0);
            insights.put("lastActivity", null);
            insights.put("primaryLanguage", "Unknown");
        }
        details.put("insights", insights);
        
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
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/contents/%s", 
                owner, repo, path != null ? path : "");
            
            if (branch != null && !branch.isBlank()) {
                url += "?ref=" + branch;
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, Object[].class);
            
            List<Map<String, Object>> files = new ArrayList<>();
            Object[] responseBody = response.getBody();
            if (responseBody != null) {
                for (Object item : responseBody) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> fileData = (Map<String, Object>) item;
                        
                        Map<String, Object> file = new HashMap<>();
                        file.put("name", fileData.get("name"));
                        file.put("path", fileData.get("path"));
                        file.put("type", fileData.get("type"));
                        file.put("size", fileData.get("size"));
                        file.put("sha", fileData.get("sha"));
                        file.put("url", fileData.get("url"));
                        file.put("htmlUrl", fileData.get("html_url"));
                        file.put("downloadUrl", fileData.get("download_url"));
                        
                        // Add frontend-friendly properties
                        String fileName = (String) fileData.get("name");
                        String fileType = (String) fileData.get("type");
                        
                        // Add file extension and category
                        if (fileName != null && fileName.contains(".")) {
                            String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
                            file.put("extension", extension);
                            file.put("category", getFileCategory(extension));
                        } else {
                            file.put("extension", "");
                            file.put("category", "folder".equals(fileType) ? "folder" : "unknown");
                        }
                        
                        // Add action capabilities for this file
                        Map<String, Boolean> fileCapabilities = new HashMap<>();
                        fileCapabilities.put("canView", true);
                        fileCapabilities.put("canEdit", !"dir".equals(fileType));
                        fileCapabilities.put("canDelete", true);
                        fileCapabilities.put("canDownload", !"dir".equals(fileType));
                        file.put("capabilities", fileCapabilities);
                        
                        // Add file size in human readable format
                        Object sizeObj = fileData.get("size");
                        if (sizeObj instanceof Number) {
                            long sizeBytes = ((Number) sizeObj).longValue();
                            file.put("sizeFormatted", formatFileSize(sizeBytes));
                        } else {
                            file.put("sizeFormatted", "-");
                        }
                        
                        files.add(file);
                    }
                }
            }
            
            log.info("Successfully retrieved {} files for {}/{} at path: {}", files.size(), owner, repo, path);
            return files;
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when getting files for {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 404) {
                throw new BusinessException("Repository, path, or branch not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to get repository files: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error getting repository files for {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to get repository files: " + e.getMessage());
        }
    }
    
    @Override
    public Map<String, Object> getFileContent(String owner, String repo, String path, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting file content for {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path);
            
            if (branch != null && !branch.isBlank()) {
                url += "?ref=" + branch;
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.GET, entity, Object.class);
            
            if (response.getBody() != null && response.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> fileData = (Map<String, Object>) response.getBody();
                
                Map<String, Object> result = new HashMap<>();
                result.put("name", fileData.get("name"));
                result.put("path", fileData.get("path"));
                result.put("sha", fileData.get("sha"));
                result.put("size", fileData.get("size"));
                result.put("encoding", fileData.get("encoding"));
                result.put("content", fileData.get("content"));
                result.put("url", fileData.get("url"));
                result.put("htmlUrl", fileData.get("html_url"));
                result.put("downloadUrl", fileData.get("download_url"));
                
                // Add enhanced file information
                String fileName = (String) fileData.get("name");
                String filePath = (String) fileData.get("path");
                
                // Add file extension and category
                if (fileName != null && fileName.contains(".")) {
                    String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
                    result.put("extension", extension);
                    result.put("category", getFileCategory(extension));
                    result.put("isEditable", isEditableFile(extension));
                } else {
                    result.put("extension", "");
                    result.put("category", "unknown");
                    result.put("isEditable", false);
                }
                
                // Add file size in human readable format
                Object sizeObj = fileData.get("size");
                if (sizeObj instanceof Number) {
                    long sizeBytes = ((Number) sizeObj).longValue();
                    result.put("sizeFormatted", formatFileSize(sizeBytes));
                } else {
                    result.put("sizeFormatted", "-");
                }
                
                // Add navigation info
                if (filePath != null && filePath.contains("/")) {
                    String parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
                    result.put("parentPath", parentPath);
                } else {
                    result.put("parentPath", "");
                }
                
                // Add action capabilities
                Map<String, Boolean> capabilities = new HashMap<>();
                capabilities.put("canEdit", true);
                capabilities.put("canDelete", true);
                capabilities.put("canDownload", true);
                capabilities.put("canView", true);
                result.put("capabilities", capabilities);
                
                log.info("Successfully retrieved file content for {}/{} at path: {}", owner, repo, path);
                return result;
            } else {
                throw new BusinessException("Empty response from GitHub API");
            }
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when getting file content for {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 404) {
                throw new BusinessException("File, repository, or branch not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to get file content: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error getting file content for {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to get file content: " + e.getMessage());
        }
    }
    
    @Override
    public List<Map<String, Object>> getRepositoryCommits(String owner, String repo, String branch, int page, int perPage, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository commits for {}/{} on branch: {} (page: {}, per_page: {}) by student: {}", owner, repo, branch, page, perPage, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/commits", owner, repo);
            List<String> params = new ArrayList<>();
            
            if (branch != null && !branch.isBlank()) {
                params.add("sha=" + branch);
            }
            params.add("page=" + page);
            params.add("per_page=" + perPage);
            
            if (!params.isEmpty()) {
                url += "?" + String.join("&", params);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, Object[].class);
            
            List<Map<String, Object>> commits = new ArrayList<>();
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> commitData = (Map<String, Object>) item;
                        
                        Map<String, Object> commit = new HashMap<>();
                        commit.put("sha", commitData.get("sha"));
                        commit.put("url", commitData.get("url"));
                        commit.put("htmlUrl", commitData.get("html_url"));
                        
                        // Extract commit details
                        if (commitData.get("commit") instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> commitDetails = (Map<String, Object>) commitData.get("commit");
                            commit.put("message", commitDetails.get("message"));
                            
                            // Extract author info
                            if (commitDetails.get("author") instanceof Map) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> author = (Map<String, Object>) commitDetails.get("author");
                                commit.put("authorName", author.get("name"));
                                commit.put("authorEmail", author.get("email"));
                                commit.put("authorDate", author.get("date"));
                            }
                            
                            // Extract committer info
                            if (commitDetails.get("committer") instanceof Map) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> committer = (Map<String, Object>) commitDetails.get("committer");
                                commit.put("committerName", committer.get("name"));
                                commit.put("committerEmail", committer.get("email"));
                                commit.put("committerDate", committer.get("date"));
                            }
                        }
                        
                        // Extract GitHub author info
                        if (commitData.get("author") instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> githubAuthor = (Map<String, Object>) commitData.get("author");
                            commit.put("githubAuthorLogin", githubAuthor.get("login"));
                            commit.put("githubAuthorAvatarUrl", githubAuthor.get("avatar_url"));
                        }
                        
                        commits.add(commit);
                    }
                }
            }
            
            log.info("Successfully retrieved {} commits for {}/{} on branch: {}", commits.size(), owner, repo, branch);
            return commits;
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when getting commits for {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 404) {
                throw new BusinessException("Repository or branch not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to get repository commits: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error getting repository commits for {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to get repository commits: " + e.getMessage());
        }
    }
    
    @Override
    public List<Map<String, Object>> getRepositoryBranches(String owner, String repo, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository branches for {}/{} by student: {}", owner, repo, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/branches", owner, repo);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, Object[].class);
            
            List<Map<String, Object>> branches = new ArrayList<>();
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> branchData = (Map<String, Object>) item;
                        
                        Map<String, Object> branch = new HashMap<>();
                        branch.put("name", branchData.get("name"));
                        branch.put("protected", branchData.get("protected"));
                        
                        // Extract commit info
                        if (branchData.get("commit") instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> commit = (Map<String, Object>) branchData.get("commit");
                            branch.put("commitSha", commit.get("sha"));
                            branch.put("commitUrl", commit.get("url"));
                        }
                        
                        branches.add(branch);
                    }
                }
            }
            
            log.info("Successfully retrieved {} branches for {}/{}", branches.size(), owner, repo);
            return branches;
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when getting branches for {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 404) {
                throw new BusinessException("Repository not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to get repository branches: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error getting repository branches for {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to get repository branches: " + e.getMessage());
        }
    }
    
    @Override
    public Map<String, Object> createFile(String owner, String repo, String path, String content, String message, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Creating file in {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path);
            
            // Create request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("message", message);
            requestBody.put("content", Base64.getEncoder().encodeToString(content.getBytes()));
            if (branch != null && !branch.isBlank()) {
                requestBody.put("branch", branch);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.PUT, entity, Object.class);
            
            if (response.getBody() != null && response.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseData = (Map<String, Object>) response.getBody();
                
                Map<String, Object> result = new HashMap<>();
                
                // Extract content info
                if (responseData.get("content") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> contentData = (Map<String, Object>) responseData.get("content");
                    result.put("name", contentData.get("name"));
                    result.put("path", contentData.get("path"));
                    result.put("sha", contentData.get("sha"));
                    result.put("size", contentData.get("size"));
                    result.put("url", contentData.get("url"));
                    result.put("htmlUrl", contentData.get("html_url"));
                    result.put("downloadUrl", contentData.get("download_url"));
                }
                
                // Extract commit info
                if (responseData.get("commit") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> commitData = (Map<String, Object>) responseData.get("commit");
                    result.put("commitSha", commitData.get("sha"));
                    result.put("commitMessage", commitData.get("message"));
                    result.put("commitUrl", commitData.get("url"));
                }
                
                log.info("Successfully created file at {}/{}/{}", owner, repo, path);
                return result;
            } else {
                throw new BusinessException("Empty response from GitHub API");
            }
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when creating file in {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 422) {
                throw new BusinessException("File already exists or validation error");
            } else if (e.getStatusCode().value() == 404) {
                throw new BusinessException("Repository not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to create file: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error creating file in {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to create file: " + e.getMessage());
        }
    }
    
    @Override
    public Map<String, Object> updateFile(String owner, String repo, String path, String content, String message, String sha, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Updating file in {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path);
            
            // Create request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("message", message);
            requestBody.put("content", Base64.getEncoder().encodeToString(content.getBytes()));
            requestBody.put("sha", sha);
            if (branch != null && !branch.isBlank()) {
                requestBody.put("branch", branch);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.PUT, entity, Object.class);
            
            if (response.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseData = (Map<String, Object>) response.getBody();
                
                Map<String, Object> result = new HashMap<>();
                
                // Extract content info
                if (responseData.get("content") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> contentData = (Map<String, Object>) responseData.get("content");
                    result.put("name", contentData.get("name"));
                    result.put("path", contentData.get("path"));
                    result.put("sha", contentData.get("sha"));
                    result.put("size", contentData.get("size"));
                    result.put("url", contentData.get("url"));
                    result.put("htmlUrl", contentData.get("html_url"));
                    result.put("downloadUrl", contentData.get("download_url"));
                }
                
                // Extract commit info
                if (responseData.get("commit") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> commitData = (Map<String, Object>) responseData.get("commit");
                    result.put("commitSha", commitData.get("sha"));
                    result.put("commitMessage", commitData.get("message"));
                    result.put("commitUrl", commitData.get("url"));
                }
                
                log.info("Successfully updated file at {}/{}/{}", owner, repo, path);
                return result;
            } else {
                throw new BusinessException("Empty response from GitHub API");
            }
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when updating file in {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 422) {
                throw new BusinessException("File SHA mismatch or validation error");
            } else if (e.getStatusCode().value() == 404) {
                throw new BusinessException("File or repository not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to update file: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error updating file in {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to update file: " + e.getMessage());
        }
    }
    
    @Override
    public Map<String, Object> deleteFile(String owner, String repo, String path, String message, String sha, String branch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Deleting file in {}/{} at path: {} on branch: {} by student: {}", owner, repo, path, branch, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path);
            
            // Create request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("message", message);
            requestBody.put("sha", sha);
            if (branch != null && !branch.isBlank()) {
                requestBody.put("branch", branch);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, Object.class);
            
            if (response.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseData = (Map<String, Object>) response.getBody();
                
                Map<String, Object> result = new HashMap<>();
                
                // Extract commit info
                if (responseData.get("commit") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> commitData = (Map<String, Object>) responseData.get("commit");
                    result.put("commitSha", commitData.get("sha"));
                    result.put("commitMessage", commitData.get("message"));
                    result.put("commitUrl", commitData.get("url"));
                }
                
                result.put("deleted", true);
                result.put("path", path);
                
                log.info("Successfully deleted file at {}/{}/{}", owner, repo, path);
                return result;
            } else {
                // For delete operations, sometimes there's no response body, which is fine
                Map<String, Object> result = new HashMap<>();
                result.put("deleted", true);
                result.put("path", path);
                
                log.info("Successfully deleted file at {}/{}/{}", owner, repo, path);
                return result;
            }
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when deleting file in {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 422) {
                throw new BusinessException("File SHA mismatch or validation error");
            } else if (e.getStatusCode().value() == 404) {
                throw new BusinessException("File or repository not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to delete file: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error deleting file in {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to delete file: " + e.getMessage());
        }
    }
    
    @Override
    public Map<String, Object> createBranch(String owner, String repo, String branchName, String fromBranch, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Creating branch {} from {} in {}/{} by student: {}", branchName, fromBranch, owner, repo, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            // First, get the SHA of the from branch
            String getBranchUrl = String.format("https://api.github.com/repos/%s/%s/git/refs/heads/%s", owner, repo, fromBranch);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Getting source branch SHA from: {}", getBranchUrl);
            ResponseEntity<Object> branchResponse = restTemplate.exchange(getBranchUrl, HttpMethod.GET, entity, Object.class);
            
            String sourceSha = null;
            if (branchResponse.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> branchData = (Map<String, Object>) branchResponse.getBody();
                if (branchData.get("object") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> objectData = (Map<String, Object>) branchData.get("object");
                    sourceSha = (String) objectData.get("sha");
                }
            }
            
            if (sourceSha == null) {
                throw new BusinessException("Could not get SHA for source branch: " + fromBranch);
            }
            
            // Now create the new branch
            String createBranchUrl = String.format("https://api.github.com/repos/%s/%s/git/refs", owner, repo);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("ref", "refs/heads/" + branchName);
            requestBody.put("sha", sourceSha);
            
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> createEntity = new HttpEntity<>(requestBody, headers);
            
            log.debug("Creating new branch at: {}", createBranchUrl);
            ResponseEntity<Object> response = restTemplate.exchange(createBranchUrl, HttpMethod.POST, createEntity, Object.class);
            
            if (response.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseData = (Map<String, Object>) response.getBody();
                
                Map<String, Object> result = new HashMap<>();
                result.put("ref", responseData.get("ref"));
                result.put("url", responseData.get("url"));
                result.put("branchName", branchName);
                result.put("fromBranch", fromBranch);
                result.put("sha", sourceSha);
                
                // Extract object info
                if (responseData.get("object") instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> objectData = (Map<String, Object>) responseData.get("object");
                    result.put("objectSha", objectData.get("sha"));
                    result.put("objectType", objectData.get("type"));
                    result.put("objectUrl", objectData.get("url"));
                }
                
                log.info("Successfully created branch {} from {} in {}/{}", branchName, fromBranch, owner, repo);
                return result;
            } else {
                throw new BusinessException("Empty response from GitHub API");
            }
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when creating branch in {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 422) {
                throw new BusinessException("Branch already exists or validation error");
            } else if (e.getStatusCode().value() == 404) {
                throw new BusinessException("Repository or source branch not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to create branch: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error creating branch in {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to create branch: " + e.getMessage());
        }
    }
    
    @Override
    public List<Map<String, Object>> getRepositoryContributors(String owner, String repo, String studentEmail) {
        User student = getStudentByEmail(studentEmail);
        log.info("Getting repository contributors for {}/{} by student: {}", owner, repo, studentEmail);
        
        if (student.getGithubToken() == null || student.getGithubToken().isBlank()) {
            throw new BusinessException("GitHub token not found. Please connect your GitHub account first.");
        }
        
        try {
            String url = String.format("https://api.github.com/repos/%s/%s/contributors", owner, repo);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.debug("Making GitHub API call to: {}", url);
            ResponseEntity<Object[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, Object[].class);
            
            List<Map<String, Object>> contributors = new ArrayList<>();
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    if (item instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> contributorData = (Map<String, Object>) item;
                        
                        Map<String, Object> contributor = new HashMap<>();
                        contributor.put("login", contributorData.get("login"));
                        contributor.put("id", contributorData.get("id"));
                        contributor.put("avatarUrl", contributorData.get("avatar_url"));
                        contributor.put("url", contributorData.get("url"));
                        contributor.put("htmlUrl", contributorData.get("html_url"));
                        contributor.put("type", contributorData.get("type"));
                        contributor.put("contributions", contributorData.get("contributions"));
                        contributor.put("siteAdmin", contributorData.get("site_admin"));
                        
                        contributors.add(contributor);
                    }
                }
            }
            
            log.info("Successfully retrieved {} contributors for {}/{}", contributors.size(), owner, repo);
            return contributors;
            
        } catch (HttpClientErrorException e) {
            log.error("GitHub API error when getting contributors for {}/{}: {} - {}", owner, repo, e.getStatusCode(), e.getMessage());
            if (e.getStatusCode().value() == 404) {
                throw new BusinessException("Repository not found");
            } else if (e.getStatusCode().value() == 403) {
                throw new BusinessException("Access denied to repository or rate limit exceeded");
            }
            throw new BusinessException("Failed to get repository contributors: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error getting repository contributors for {}/{}: {}", owner, repo, e.getMessage());
            throw new BusinessException("Failed to get repository contributors: " + e.getMessage());
        }
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
            // Try to fetch user info to test GitHub access
            String url = "https://api.github.com/user";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "EspritHub-Server");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            
            log.debug("Making GitHub API call to: {}", url);
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                debugInfo.put("tokenValid", true);
                debugInfo.put("githubUserData", response.getBody());
                log.debug("GitHub API call successful for student: {}", studentEmail);
            } else {
                debugInfo.put("tokenValid", false);
                debugInfo.put("error", "Invalid token - status: " + response.getStatusCode());
                log.warn("GitHub API call failed with status: {} for student: {}", response.getStatusCode(), studentEmail);
            }
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            debugInfo.put("tokenValid", false);
            debugInfo.put("error", "Network connection error: " + e.getMessage());
            debugInfo.put("errorType", "NETWORK_ERROR");
            log.error("Network error during GitHub API call for student {}: {}", studentEmail, e.getMessage());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            debugInfo.put("tokenValid", false);
            debugInfo.put("error", "GitHub API error: " + e.getStatusCode() + " - " + e.getMessage());
            debugInfo.put("errorType", "HTTP_CLIENT_ERROR");
            debugInfo.put("statusCode", e.getStatusCode().value());
            log.error("GitHub API HTTP error for student {}: {} - {}", studentEmail, e.getStatusCode(), e.getMessage());
        } catch (Exception e) {
            debugInfo.put("tokenValid", false);
            debugInfo.put("error", "Token test failed: " + e.getMessage());
            debugInfo.put("errorType", "GENERAL_ERROR");
            log.error("General error during GitHub API call for student {}: {}", studentEmail, e.getMessage(), e);
        }
        
        // Also add repository access debug information
        try {
            List<Map<String, Object>> accessibleRepos = getAccessibleRepositories(studentEmail);
            debugInfo.put("accessibleRepositoriesCount", accessibleRepos.size());
            debugInfo.put("accessibleRepositoryIds", accessibleRepos.stream()
                .map(repo -> repo.get("id"))
                .collect(java.util.stream.Collectors.toList()));
        } catch (Exception e) {
            debugInfo.put("repositoryAccessError", "Failed to get accessible repositories: " + e.getMessage());
        }
        
        return debugInfo;
    }
    
    // Helper methods for file operations
    private String getFileCategory(String extension) {
        if (extension == null || extension.isEmpty()) {
            return "unknown";
        }
        
        return switch (extension.toLowerCase()) {
            case "java", "js", "ts", "py", "cpp", "c", "cs", "php", "rb", "go", "rs", "kt", "swift" -> "code";
            case "html", "css", "scss", "less", "xml", "xsl", "xslt" -> "markup";
            case "json", "yaml", "yml", "toml", "ini", "conf", "config" -> "config";
            case "md", "txt", "rtf", "pdf", "doc", "docx" -> "document";
            case "png", "jpg", "jpeg", "gif", "svg", "ico", "webp" -> "image";
            case "mp3", "wav", "ogg", "m4a", "flac" -> "audio";
            case "mp4", "avi", "mov", "wmv", "flv", "webm" -> "video";
            case "zip", "rar", "7z", "tar", "gz", "bz2" -> "archive";
            case "sql", "db", "sqlite", "mdb" -> "database";
            case "sh", "bat", "ps1", "cmd" -> "script";
            default -> "file";
        };
    }
    
    private String formatFileSize(long bytes) {
        if (bytes <= 0) return "0 B";
        
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = (int) (Math.log(bytes) / Math.log(1024));
        unitIndex = Math.min(unitIndex, units.length - 1);
        
        double size = bytes / Math.pow(1024, unitIndex);
        return String.format("%.1f %s", size, units[unitIndex]);
    }
    
    private boolean isEditableFile(String extension) {
        if (extension == null || extension.isEmpty()) {
            return false;
        }
        
        // Define editable file extensions
        String[] editableExtensions = {
            "java", "js", "ts", "py", "cpp", "c", "cs", "php", "rb", "go", "rs", "kt", "swift",
            "html", "css", "scss", "less", "xml", "json", "yaml", "yml", "toml", "ini", "conf",
            "md", "txt", "sh", "bat", "ps1", "cmd", "sql", "properties", "gradle", "maven"
        };
        
        for (String editableExt : editableExtensions) {
            if (editableExt.equalsIgnoreCase(extension)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Search the user's GitHub repositories for a match when direct repository names don't work
     */
    private Map<String, Object> searchUserRepositoriesForMatch(User student, List<String> targetNames) {
        String accessToken = student.getGithubToken();
        
        try {
            log.info("Searching user's repositories for matches with: {}", targetNames);
            
            String url = "https://api.github.com/user/repos?per_page=100&type=all";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.set("Accept", "application/vnd.github.v3+json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, 
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> repositories = response.getBody();
                log.info("Found {} repositories in user's GitHub account", repositories.size());
                
                // Try exact matches first
                for (String targetName : targetNames) {
                    for (Map<String, Object> repo : repositories) {
                        String repoName = (String) repo.get("name");
                        if (targetName.equals(repoName)) {
                            log.info("Found exact match in user repositories: {}", repoName);
                            return repo;
                        }
                    }
                }
                
                // Try case-insensitive matches
                for (String targetName : targetNames) {
                    for (Map<String, Object> repo : repositories) {
                        String repoName = (String) repo.get("name");
                        if (repoName != null && repoName.equalsIgnoreCase(targetName)) {
                            log.info("Found case-insensitive match in user repositories: {} for target: {}", repoName, targetName);
                            return repo;
                        }
                    }
                }
                
                // Try fuzzy matches (contains)
                for (String targetName : targetNames) {
                    for (Map<String, Object> repo : repositories) {
                        String repoName = (String) repo.get("name");
                        if (repoName != null && repoName.toLowerCase().contains(targetName.toLowerCase())) {
                            log.info("Found fuzzy match in user repositories: {} contains target: {}", repoName, targetName);
                            return repo;
                        }
                    }
                }
                
                log.warn("No matching repository found in user's GitHub account for targets: {}", targetNames);
            } else {
                log.warn("Failed to fetch user repositories. Status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Error searching user repositories: {}", e.getMessage());
        }
        
        return Collections.emptyMap();
    }
    
    /**
     * Search for a repository in the user's GitHub repositories by numeric repository ID
     * @param student The user to search for
     * @param targetGitHubId The GitHub numeric repository ID to search for
     * @return The repository map if found, null otherwise
     */
    private Map<String, Object> searchUserRepositoriesById(User student, String targetGitHubId) {
        log.info("Searching user's GitHub repositories for ID: {}", targetGitHubId);
        
        try {
            String url = "https://api.github.com/user/repos?per_page=100&type=all";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(student.getGithubToken());
            headers.set("Accept", "application/vnd.github.v3+json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            // Fetch multiple pages if necessary
            List<Map<String, Object>> allRepositories = new ArrayList<>();
            int page = 1;
            boolean hasMorePages = true;
            
            while (hasMorePages && page <= 10) { // Limit to 10 pages for safety
                String pagedUrl = url + "&page=" + page;
                log.debug("Fetching GitHub repositories page {}: {}", page, pagedUrl);
                
                ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    pagedUrl,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                );
                
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null && !response.getBody().isEmpty()) {
                    allRepositories.addAll(response.getBody());
                    page++;
                } else {
                    hasMorePages = false;
                }
            }
            
            log.info("Found {} total repositories in user's GitHub account", allRepositories.size());
            
            // Search for the repository by ID
            for (Map<String, Object> repo : allRepositories) {
                Object repoId = repo.get("id");
                if (repoId != null && targetGitHubId.equals(String.valueOf(repoId))) {
                    log.info("Found matching repository by GitHub ID {}: {}", targetGitHubId, repo.get("name"));
                    return repo;
                }
            }
            
            log.info("No repository found with GitHub ID: {}", targetGitHubId);
            return null;
            
        } catch (Exception e) {
            log.error("Error searching user's GitHub repositories by ID {}: {}", targetGitHubId, e.getMessage());
            return null;
        }
    }
}
