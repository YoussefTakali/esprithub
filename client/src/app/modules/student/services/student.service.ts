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
  projectId: string;
  projectName: string;
  classId: string;
  className: string;
  members: GroupMember[];
  repository?: Repository;
  createdAt: Date;
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
  // Group information
  groupId: string;
  groupName: string;
  projectId?: string;
  projectName?: string;
  // Access information
  accessLevel: string;
  canPush: boolean;
  canPull: boolean;
}

export interface StudentProject {
  id: string;
  name: string;
  description: string;
  deadline: Date;
  createdBy: string;
  createdByName: string;
  collaborators: Collaborator[];
  groups: StudentGroup[];
  tasks: StudentTask[];
  classes: ProjectClass[];
  createdAt: Date;
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
  fileSize: number;
  fileType: string;
  uploadDate: Date;
  downloadUrl: string;
}

export interface StudentSchedule {
  weeklySchedule: ScheduleItem[];
  upcomingEvents: ScheduleEvent[];
  deadlines: TaskDeadline[];
}

export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  type: 'COURSE' | 'TD' | 'TP';
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

  getDashboard(): Observable<StudentDashboard> {
    return this.http.get<StudentDashboard>(`${this.apiUrl}/dashboard`);
  }

  getTasks(): Observable<StudentTask[]> {
    return this.http.get<TasksResponse>(`${this.apiUrl}/tasks`).pipe(
      map(response => response.content)
    );
  }

  getTaskDetails(taskId: string): Observable<StudentTask> {
    return this.http.get<StudentTask>(`${this.apiUrl}/tasks/${taskId}`);
  }

  updateTaskStatus(taskId: string, status: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/tasks/${taskId}/status`, { status });
  }

  submitTask(taskId: string, submission: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/tasks/${taskId}/submit`, submission);
  }

  getGroups(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>(`${this.apiUrl}/groups`);
  }

  getGroupDetails(groupId: string): Observable<StudentGroup> {
    return this.http.get<StudentGroup>(`${this.apiUrl}/groups/${groupId}`);
  }

  getProjects(): Observable<StudentProject[]> {
    return this.http.get<StudentProject[]>(`${this.apiUrl}/projects`);
  }

  getProjectDetails(projectId: string): Observable<StudentProject> {
    return this.http.get<StudentProject>(`${this.apiUrl}/projects/${projectId}`);
  }

  getSubmissions(): Observable<StudentSubmission[]> {
    return this.http.get<{ content: StudentSubmission[] }>(`${this.apiUrl}/submissions`).pipe(
      map(response => response.content || [])
    );
  }

  getRepositories(): Observable<Repository[]> {
    return this.http.get<any[]>(`${this.apiUrl}/repositories`).pipe(
      map(response => response || [])
    );
  }

  getRepositoryDetails(repositoryId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/repositories/${repositoryId}/details`);
  }

  getRepositoryGitHubDetails(repositoryId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/repositories/${repositoryId}/github-details`);
  }

  getAllGitHubRepositories(): Observable<any[]> {
    const url = `${this.apiUrl}/github-repositories`;
    console.log('Calling getAllGitHubRepositories with URL:', url);
    return this.http.get<any[]>(url);
  }

  getSchedule(): Observable<StudentSchedule> {
    return this.http.get<StudentSchedule>(`${this.apiUrl}/schedule`);
  }

  getProfile(): Observable<any> { 
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, profileData);
  }

  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }
}
