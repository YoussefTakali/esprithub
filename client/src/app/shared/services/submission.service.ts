import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  graded: boolean;
  hasSubmitted: boolean;
  groupId: string | null;
  groupName: string | null;
  repositoryId: string | null;
}

export interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  groupId: string | null;
  groupName: string | null;
  commitHash: string;
  submittedAt: string;
  status: string;
  grade: number | null;
  maxGrade: number | null;
  feedback: string | null;
  gradedAt: string | null;
  gradedByName: string | null;
  isLate: boolean;
  attemptNumber: number;
  notes: string | null;
  gradePercentage: number | null;
  isPassing: boolean;
  isGraded: boolean;
}

export interface SubmissionFile {
  id: string;
  name: string; // Backend sends 'name', not 'fileName'
  originalName?: string;
  path?: string; // Backend sends 'path', not 'filePath'
  size?: number; // Backend sends 'size' directly
  contentType?: string;
  fileUrl?: string;
  content?: string; // Base64 encoded content
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  type?: string; // Backend sends 'type'
  extension?: string; // Backend sends 'extension'
  displaySize?: string; // Backend sends 'displaySize'
  
  // Legacy aliases for compatibility
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  fileType?: string;
}

export interface SubmissionDetails extends Submission {
  taskDescription: string;
  repositoryId: string | null;
  repositoryName: string | null;
  repositoryUrl: string | null;
  files: SubmissionFile[] | null;
  commitDetails: {
    hash: string;
    message: string;
    author: string;
    date: string;
    url: string;
  } | null;
}

export interface CreateSubmissionRequest {
  taskId: string;
  commitHash: string;
  groupId?: string;
  notes?: string;
}

export interface GradeSubmissionRequest {
  grade: number;
  maxGrade: number;
  feedback?: string;
}

export interface GradeSubmissionData {
  grade: number;
  maxGrade: number;
  feedback?: string;
}

export interface RepositoryCommit {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerName: string;
  committerEmail: string;
  committerDate: string;
  githubUrl: string;
  repository: any;
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/submissions`;
  private readonly repositoryApiUrl = `${environment.apiUrl}/api/student/repositories`;

  constructor(private readonly http: HttpClient) {}

  // Student methods
  getAvailableTasksForSubmission(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/available-tasks`);
  }

  createSubmission(request: CreateSubmissionRequest): Observable<Submission> {
    return this.http.post<Submission>(this.apiUrl, request);
  }

  getMySubmissions(page: number = 0, size: number = 20): Observable<{ content: Submission[], totalElements: number, totalPages: number }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<{ content: Submission[], totalElements: number, totalPages: number }>(`${this.apiUrl}/my-submissions`, { params });
  }

  getSubmissionDetails(submissionId: string): Observable<SubmissionDetails> {
    return this.http.get<SubmissionDetails>(`${this.apiUrl}/${submissionId}`);
  }

  // Teacher/Admin methods
  getSubmissionsForTask(taskId: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.apiUrl}/task/${taskId}`);
  }

  /**
   * Get submissions for teacher (tasks they created or collaborate on)
   */
  getTeacherSubmissions(page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(`${this.apiUrl}/teacher-submissions`, { params });
  }

  /**
   * Grade a submission
   */
  gradeSubmission(submissionId: string, gradeData: GradeSubmissionRequest): Observable<Submission> {
    return this.http.put<Submission>(`${this.apiUrl}/${submissionId}/grade`, gradeData);
  }

  // Repository methods for commits
  getRepositoryCommits(repositoryId: string, page: number = 0, size: number = 20): Observable<{
    commits: RepositoryCommit[],
    repositoryId: string,
    page: number,
    size: number,
    totalCommits: number
  }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<{
      commits: RepositoryCommit[],
      repositoryId: string,
      page: number,
      size: number,
      totalCommits: number
    }>(`${this.repositoryApiUrl}/${repositoryId}/commits`, { params });
  }

  getRepositoryFiles(repositoryId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.repositoryApiUrl}/${repositoryId}/files`);
  }

  getFileContent(fileId: string): Observable<any> {
    return this.http.get<any>(`${this.repositoryApiUrl}/files/${fileId}/content`);
  }
}
