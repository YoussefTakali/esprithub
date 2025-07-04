import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface StudentDashboard {
  activeTasks: number;
  completedTasks: number;
  totalGroups: number;
  totalProjects: number;
  upcomingDeadlines: TaskDeadline[];
  recentNotifications: Notification[];
  progressStats: ProgressStats;
}

export interface TaskDeadline {
  id: string;
  title: string;
  dueDate: Date;
  type: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: Date;
  read: boolean;
}

export interface ProgressStats {
  tasksCompletionRate: number;
  submissionsOnTime: number;
  groupParticipation: number;
}

export interface StudentTask {
  id: string;
  title: string;
  description: string;
  type: 'INDIVIDUAL' | 'GROUP' | 'CLASS';
  dueDate: Date;
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PUBLISHED' | 'CLOSED';
  isGraded: boolean;
  isVisible: boolean;
  projectId?: string;
  projectName?: string;
  groupId?: string;
  groupName?: string;
  classId?: string;
  className?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TasksResponse {
  content: StudentTask[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface StudentGroup {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  projectDeadline: string | null;
  classId: string;
  className: string;
  members: GroupMember[] | null;
  totalMembers: number;
  myRole: string | null;
  repositoryId: string | null;
  repositoryName: string | null;
  repositoryUrl: string | null;
  repositoryCloneUrl: string | null;
  hasRepository: boolean;
  assignedTasks: any[] | null;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  lastActivity: string | null;
  currentStatus: string | null;
  totalCommits: number;
  myCommits: number;
  mostActiveContributor: string | null;
  recentAnnouncements: any[] | null;
  hasUnreadMessages: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
  cloneUrl: string;
  sshUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerName: string;
  groupId: string;
  groupName: string;
  projectId?: string;
  projectName?: string;
  accessLevel: string;
  canPush: boolean;
  canPull: boolean;
}

export interface StudentProject {
  id: string;
  name: string;
  description: string;
  deadline: Date | string;
  daysLeft?: number;
  teacherName: string;
  teacherEmail: string | null;
  teacherId: string;
  classId: string | null;
  className: string | null;
  myGroupId: string | null;
  myGroupName: string | null;
  myGroupMembers: any[] | null;
  myRole: string | null;
  completionRate: number;
  myGroupProgress: number;
  currentPhase: string | null;
  tasks: any[] | null;
  totalTasks: number;
  completedTasks: number;
  myCompletedTasks: number;
  repositoryId: string | null;
  repositoryName: string | null;
  repositoryUrl: string | null;
  hasRepository: boolean;
  totalGroups: number;
  activeGroups: number;
  allGroups: any[] | null;
  recentActivities: any[] | null;
  lastActivity: string | null;
  submissionDate: string | null;
  grade: number | null;
  feedback: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  status: string | null;
  graded: boolean;
  overdue: boolean;
  submitted: boolean;
  // From second interface
  createdBy?: string;
  createdByName?: string;
  collaborators?: Collaborator[];
  groups?: StudentGroup[];
  classes?: ProjectClass[];
}

export interface Collaborator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface ProjectClass {
  id: string;
  name: string;
  niveau: string;
}

export interface StudentSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  studentId: string;
  submissionDate: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED';
  grade?: number;
  feedback?: string;
  files: SubmissionFile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionFile {
  id: string;
  fileName: string;
  originalName?: string;
  fileSize: number;
  contentType?: string;
  fileType?: string;
  fileUrl?: string;
  downloadUrl?: string;
  uploadDate?: Date;
  createdAt?: Date;
}

export interface StudentSchedule {
  monday?: ScheduleItem[];
  tuesday?: ScheduleItem[];
  wednesday?: ScheduleItem[];
  thursday?: ScheduleItem[];
  friday?: ScheduleItem[];
  saturday?: ScheduleItem[];
  sunday?: ScheduleItem[];
  weeklySchedule: ScheduleItem[];
  upcomingEvents: ScheduleEvent[];
  deadlines?: TaskDeadline[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  day?: string;
  time?: string;
  subject?: string;
  type: 'CLASS' | 'LAB' | 'EXAM' | 'MEETING' | 'DEADLINE' | 'COURSE' | 'TD' | 'TP';
  location?: string;
  teacher?: string;
  description?: string;
  color?: string;
  room?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: string;
  location?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly apiUrl = `${environment.apiUrl}/api/student`;

  constructor(private readonly http: HttpClient) {}

  // Dashboard methods
  getDashboard(): Observable<StudentDashboard> {
    return this.http.get<StudentDashboard>(`${this.apiUrl}/dashboard`);
  }

  // Task methods
  getTasks(page: number = 0, size: number = 10): Observable<StudentTask[]> {
    return this.http.get<TasksResponse>(`${this.apiUrl}/tasks?page=${page}&size=${size}`)
      .pipe(
        map(response => response.content || [])
      );
  }

  getTaskDetails(taskId: string): Observable<StudentTask> {
    return this.http.get<StudentTask>(`${this.apiUrl}/tasks/${taskId}`);
  }

  updateTaskStatus(taskId: string, status: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/tasks/${taskId}/status`, { status });
  }

  submitTask(taskId: string, submissionRequest: any): Observable<any> {
    const formData = new FormData();
    formData.append('repositoryId', submissionRequest.repositoryId);
    formData.append('branch', submissionRequest.branch);
    if (submissionRequest.commitHash) {
      formData.append('commitHash', submissionRequest.commitHash);
    }
    formData.append('notes', submissionRequest.notes);
    
    if (submissionRequest.files && submissionRequest.files.length > 0) {
      submissionRequest.files.forEach((file: File) => {
        formData.append('files', file);
      });
    }
    
    return this.http.post<any>(`${this.apiUrl}/tasks/${taskId}/submit`, formData);
  }

  // Group methods
  getGroups(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>(`${this.apiUrl}/groups`);
  }

  getGroupDetails(groupId: string): Observable<StudentGroup> {
    return this.http.get<StudentGroup>(`${this.apiUrl}/groups/${groupId}`);
  }

  getGroupRepositories(groupId: string): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.apiUrl}/groups/${groupId}/repositories`);
  }

  // Project methods
  getProjects(): Observable<StudentProject[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projects`).pipe(
      map(projects =>
        (projects ?? []).map(project => {
          let tasks = project.tasks;
          if (typeof tasks === 'string') {
            try {
              tasks = JSON.parse(tasks);
            } catch {
              tasks = [];
            }
          }
          if (!Array.isArray(tasks)) {
            tasks = [];
          }
          return {
            ...project,
            deadline: project.deadline ? new Date(project.deadline) : null,
            createdAt: project.createdAt ? new Date(project.createdAt) : null,
            collaborators: project.collaborators ?? [],
            groups: project.groups ?? [],
            tasks,
            classes: project.classes ?? [],
            createdByName: project.createdByName ?? project.createdBy ?? 'N/A',
          };
        })
      )
    );
  }

  getProjectDetails(projectId: string): Observable<StudentProject> {
    return this.http.get<StudentProject>(`${this.apiUrl}/projects/${projectId}`);
  }

  // Submission methods
  getSubmissions(page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/submissions?page=${page}&size=${size}`);
  }

  // Repository methods
  getRepositories(): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.apiUrl}/repositories`);
  }

  getStudentRepositories(): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.apiUrl}/repositories`);
  }

  getRepositoryDetails(repositoryId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/repositories/${repositoryId}`);
  }

  getGitHubRepositoryDetails(repositoryId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/repositories/${repositoryId}/github-details`);
  }

  getRepositoryBranchesById(repositoryId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/repositories/${repositoryId}/branches`);
  }

  getAllGitHubRepositories(): Observable<any[]> {
    const url = `${this.apiUrl}/github-repositories`;
    console.log('Calling getAllGitHubRepositories with URL:', url);
    return this.http.get<any[]>(url);
  }

  // Schedule methods
  getSchedule(): Observable<StudentSchedule> {
    return this.http.get<StudentSchedule>(`${this.apiUrl}/schedule`);
  }

  // Profile methods
  getProfile(): Observable<any> { 
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, profileData);
  }

  // Notification methods
  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  // GitHub Repository Operations
  getRepositoryOverview(owner: string, repo: string, branch: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/github/${owner}/${repo}/overview?branch=${branch}`);
  }

  getRepositoryCommits(owner: string, repo: string, branch: string, page: number, size: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/github/${owner}/${repo}/commits?branch=${branch}&page=${page}&size=${size}`);
  }

  getRepositoryContributors(owner: string, repo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/github/${owner}/${repo}/contributors`);
  }

  getRepositoryBranches(owner: string, repo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/github/${owner}/${repo}/branches`);
  }

  getRepositoryFiles(owner: string, repo: string, path: string, branch: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/github/${owner}/${repo}/files?path=${path}&branch=${branch}`);
  }

  getFileContent(owner: string, repo: string, path: string, branch: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/github/${owner}/${repo}/file-content?path=${path}&branch=${branch}`);
  }

  getRepositoryFileTree(owner: string, repo: string, branch?: string): Observable<any> {
    let url = `${this.apiUrl}/github/${owner}/${repo}/file-tree`;
    if (branch) {
      url += `?branch=${branch}`;
    }
    return this.http.get<any>(url);
  }

  // File modification operations
  createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string = 'main'): Observable<any> {
    const url = `${this.apiUrl}/github/${owner}/${repo}/files`;
    const body = { path, content, message, branch };
    return this.http.post<any>(url, body);
  }

  updateFile(owner: string, repo: string, path: string, content: string, message: string, sha: string, branch: string = 'main'): Observable<any> {
    const url = `${this.apiUrl}/github/${owner}/${repo}/files`;
    const body = { path, content, message, sha, branch };
    return this.http.put<any>(url, body);
  }

  deleteFile(owner: string, repo: string, path: string, message: string, sha: string, branch: string = 'main'): Observable<any> {
    const params = new URLSearchParams();
    params.append('path', path);
    params.append('message', message);
    params.append('sha', sha);
    params.append('branch', branch);
    
    const url = `${this.apiUrl}/github/${owner}/${repo}/files?${params.toString()}`;
    return this.http.delete<any>(url);
  }

  createBranch(owner: string, repo: string, branchName: string, fromBranch: string = 'main'): Observable<any> {
    const url = `${this.apiUrl}/github/${owner}/${repo}/branches`;
    const body = { name: branchName, from: fromBranch };
    return this.http.post<any>(url, body);
  }

  // File upload methods
  uploadFile(owner: string, repo: string, file: File, filePath: string, commitMessage: string, branch: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filePath', filePath);
    formData.append('commitMessage', commitMessage);
    formData.append('branch', branch);
    
    return this.http.post<any>(`${this.apiUrl}/github/${owner}/${repo}/upload-file`, formData);
  }

  uploadMultipleFiles(owner: string, repo: string, files: File[], basePath: string, commitMessage: string, branch: string): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('basePath', basePath);
    formData.append('commitMessage', commitMessage);
    formData.append('branch', branch);
    
    return this.http.post<any>(`${this.apiUrl}/github/${owner}/${repo}/upload-multiple-files`, formData);
  }
}