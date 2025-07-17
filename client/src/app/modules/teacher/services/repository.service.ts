import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders, HttpResponse  } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs/operators';
export interface Repository {
  name: string;
  fullName: string;
  description: string;
  url: string;
  private: boolean;
  isPrivate?: boolean;
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
  avatarUrl?: string;
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
  private readonly apiUrl = `${environment.apiUrl}/api/repositories`;
  private readonly githubApiUrl = `${environment.apiUrl}/api/v1/github`;

  constructor(private readonly http: HttpClient,) {}

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

getRepositoryFiles(repoFullName: string, branch: string = 'main'): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/${repoFullName}/files?branch=${branch}`);
}
 

  getFileContent(repoFullName: string, filePath: string, branch: string = 'main'): Observable<{content: string, encoding?: string}> {
    // This method needs to be updated to work with file IDs instead of file paths
    // For now, we'll try the original approach but it might need backend changes
    return this.http.get<{content: string, encoding?: string}>(`${this.apiUrl}/${repoFullName}/files/${encodeURIComponent(filePath)}/content?branch=${branch}`);
  }

  getFileContentById(fileId: string): Observable<{content: string, encoding?: string}> {
    return this.http.get<{content: string, encoding?: string}>(`${this.githubApiUrl}/files/${fileId}/content`);
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
  // remove invitation
  cancelInvitation(repoFullName: string, email: string) {
  return this.http.delete(`${this.apiUrl}/${repoFullName}/invitations/${encodeURIComponent(email)}`);
}


  // Get repository commits
  getCommits(repoFullName: string, branch: string = 'main', page: number = 1): Observable<CommitInfo[]> {
    return this.http.get<CommitInfo[]>(`${this.apiUrl}/${repoFullName}/commits?branch=${branch}&page=${page}`);
  }
  deleteBranch(repoFullName: string, branchName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${repoFullName}/branches/${encodeURIComponent(branchName)}`);
  }
  // Get latest commit for a specific path
  getLatestCommit(owner: string, repo: string, path: string, branch: string = 'main'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/latest-commit?owner=${owner}&repo=${repo}&path=${encodeURIComponent(path)}&branch=${branch}`);
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

getRawFileContent(rawUrl: string): Observable<string> {
  return this.http.get(rawUrl, { responseType: 'text' });
}
getCommitCount(owner: string, repo: string, branch: string): Observable<number> {
  let url = `/api/repositories/${owner}/${repo}/commits/count?branch=salmabenmiled`;

 

  return this.http.get<{ count: number }>(url).pipe(
    map(res => res.count)
  );
}


}
