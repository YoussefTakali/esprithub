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
  isProtected: boolean;
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
    return this.http.get<RepositoryStats>(`${this.apiUrl}/${encodeURIComponent(repoFullName)}/stats`);
  }

  uploadFile(repoFullName: string, file: File, path: string, commitMessage: string, branch: string = 'main'): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('message', commitMessage);
    formData.append('branch', branch);

    return this.http.post<string>(`${this.apiUrl}/${encodeURIComponent(repoFullName)}/upload`, formData);
  }

  getRepositoryFiles(repoFullName: string, branch: string = 'main'): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${encodeURIComponent(repoFullName)}/files?branch=${branch}`);
  }

  getRepositoryBranches(repoFullName: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${encodeURIComponent(repoFullName)}/branches`);
  }

  deleteFile(repoFullName: string, filePath: string, commitMessage: string, branch: string = 'main'): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/${encodeURIComponent(repoFullName)}/files/${encodeURIComponent(filePath)}?message=${encodeURIComponent(commitMessage)}&branch=${branch}`);
  }
}
