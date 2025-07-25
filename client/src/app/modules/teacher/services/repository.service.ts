import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Repository {
  name: string;
  fullName: string;
  description: string;
  url: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  defaultBranch: string;
  starCount: number;
  forkCount: number;
  language: string;
  size: number;
  collaborators: string[];
  branches: string[];
  hasIssues: boolean;
  hasWiki: boolean;
  cloneUrl: string;
  sshUrl: string;
}

export interface RepositoryStats {
  repositoryName: string;
  fullName: string;
  totalCommits: number;
  totalBranches: number;
  totalCollaborators: number;
  totalFiles: number;
  totalSize: number;
  lastActivity: string;
  mostActiveContributor: string;
  languageStats: { [key: string]: number };
  recentCommits: CommitInfo[];
  branchActivity: BranchActivity[];
  openIssues: number;
  closedIssues: number;
  openPullRequests: number;
  mergedPullRequests: number;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface BranchActivity {
  branchName: string;
  commitCount: number;
  lastCommit: string;
  lastCommitAuthor: string;
  protected: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  isActive: boolean;
  githubUsername: string;
  departementNom: string;
  classeNom: string;
}

@Injectable({
  providedIn: 'root'
})
export class RepositoryService {
  private apiUrl = `${environment.apiUrl}/api/repositories`;

  constructor(private http: HttpClient) {}

  getTeacherRepositories(): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.apiUrl}/teacher`);
  }

  getRepositoryStats(repoFullName: string): Observable<RepositoryStats> {
    return this.http.get<RepositoryStats>(`${this.apiUrl}/${repoFullName}/stats`);
  }

  searchUsers(query: string): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.apiUrl}/users/search?q=${encodeURIComponent(query)}`);
  }

  uploadFile(repoFullName: string, file: File, path: string, commitMessage: string, branch: string = 'main'): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('message', commitMessage);
    formData.append('branch', branch);

    return this.http.post<string>(`${this.apiUrl}/${repoFullName}/upload`, formData);
  }

  getRepositoryFiles(repoFullName: string, branch: string = 'main'): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${repoFullName}/files?branch=${branch}`);
  }

  getRepositoryBranches(repoFullName: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${repoFullName}/branches`);
  }

  deleteFile(repoFullName: string, filePath: string, commitMessage: string, branch: string = 'main'): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${repoFullName}/files/${encodeURIComponent(filePath)}?message=${encodeURIComponent(commitMessage)}&branch=${branch}`);
  }

  // Create a new branch
  createBranch(repoFullName: string, branchName: string, fromBranch: string = 'main'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${repoFullName}/branches`, {
      name: branchName,
      from: fromBranch
    });
  }

  // Delete a branch
  deleteBranch(repoFullName: string, branchName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${repoFullName}/branches/${encodeURIComponent(branchName)}`);
  }

  // Get repository collaborators
  getCollaborators(repoFullName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${repoFullName}/collaborators`);
  }

  // Add collaborator
  addCollaborator(repoFullName: string, username: string, permission: string = 'push'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${repoFullName}/collaborators`, {
      username: username,
      permission: permission
    });
  }

  // Remove collaborator
  removeCollaborator(repoFullName: string, username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${repoFullName}/collaborators/${encodeURIComponent(username)}`);
  }

  // Get repository commits
  getCommits(repoFullName: string, branch: string = 'main', page: number = 1): Observable<CommitInfo[]> {
    return this.http.get<CommitInfo[]>(`${this.apiUrl}/${repoFullName}/commits?branch=${branch}&page=${page}`);
  }

  // Update repository settings
  updateRepository(repoFullName: string, settings: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${repoFullName}`, settings);
  }

  // Delete repository
  deleteRepository(repoFullName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${repoFullName}`);
  }

  // Create repository
  createRepository(name: string, description: string, isPrivate: boolean = true): Observable<Repository> {
    return this.http.post<Repository>(this.apiUrl, {
      name: name,
      description: description,
      isPrivate: isPrivate
    });
  }
}
