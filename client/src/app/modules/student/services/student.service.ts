import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  updatedAt: Date;
}

export interface Collaborator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectClass {
  id: string;
  name: string;
  description: string;
  capacity: number;
  code: string;
}

export interface StudentSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  submittedAt: Date;
  status: string;
  grade?: number;
  feedback?: string;
  files: SubmissionFile[];
}

export interface SubmissionFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface StudentSchedule {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: 'task' | 'project' | 'deadline' | 'event';
  relatedId?: string;
  location?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly apiUrl = 'http://localhost:8090/api/student';

  constructor(private readonly http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<StudentDashboard> {
    return this.http.get<StudentDashboard>(`${this.apiUrl}/dashboard`);
  }

  // Tasks
  getTasks(): Observable<StudentTask[]> {
    return this.http.get<StudentTask[]>(`${this.apiUrl}/tasks`);
  }

  getTaskById(id: string): Observable<StudentTask> {
    return this.http.get<StudentTask>(`${this.apiUrl}/tasks/${id}`);
  }

  updateTaskStatus(taskId: string, status: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/tasks/${taskId}/status`, { status });
  }

  // Groups
  getGroups(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>(`${this.apiUrl}/groups`);
  }

  getGroupById(id: string): Observable<StudentGroup> {
    return this.http.get<StudentGroup>(`${this.apiUrl}/groups/${id}`);
  }

  // Projects
  getProjects(): Observable<StudentProject[]> {
    return this.http.get<StudentProject[]>(`${this.apiUrl}/projects`);
  }

  getProjectById(id: string): Observable<StudentProject> {
    return this.http.get<StudentProject>(`${this.apiUrl}/projects/${id}`);
  }

  // Submissions
  getSubmissions(): Observable<StudentSubmission[]> {
    return this.http.get<StudentSubmission[]>(`${this.apiUrl}/submissions`);
  }

  submitTask(taskId: string, files: File[]): Observable<StudentSubmission> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post<StudentSubmission>(`${this.apiUrl}/tasks/${taskId}/submit`, formData);
  }

  // Repositories
  getRepositories(): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.apiUrl}/repositories`);
  }

  getRepositoryById(id: string): Observable<Repository> {
    return this.http.get<Repository>(`${this.apiUrl}/repositories/${id}`);
  }

  // Notifications
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  markNotificationAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  // Schedule
  getSchedule(): Observable<StudentSchedule[]> {
    return this.http.get<StudentSchedule[]>(`${this.apiUrl}/schedule`);
  }

  // Profile
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  updateProfile(profile: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, profile);
  }
}
