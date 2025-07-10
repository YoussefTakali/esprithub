import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
  cloneUrl?: string;
  sshUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    githubUsername?: string;
    githubName?: string;
  };
  group?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedToStudents: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
  assignedToGroups: Array<{
    id: string;
    name: string;
  }>;
}

export interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  githubUsername?: string;
  githubName?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  departement?: {
    id: string;
    nom: string;
  };
  classe?: {
    id: string;
    nom: string;
  };
  repositories: Repository[];
  tasks: Task[];
  webhookSubscriptions?: Array<{
    id: string;
    status: string;
    repositoryName: string;
    lastDelivery?: string;
  }>;
}

export interface GitHubRepositoryDetails {
  name: string;
  fullName: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
  starCount: number;
  forkCount: number;
  language?: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  branches: Array<{
    name: string;
    sha: string;
    protected: boolean;
  }>;
  commits: Array<{
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    url: string;
  }>;
  contributors: Array<{
    login: string;
    contributions: number;
    avatarUrl: string;
  }>;
  languages: { [key: string]: number };
  releases: Array<{
    tagName: string;
    name: string;
    publishedAt: string;
    prerelease: boolean;
  }>;
  files: Array<{
    name: string;
    path: string;
    type: 'file' | 'dir';
    size?: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AdminRepositoryService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Get detailed user information including repositories and tasks
   */
  getUserDetails(userId: string): Observable<UserDetails> {
    return this.http.get<UserDetails>(`${this.baseUrl}/admin/users/${userId}/details`);
  }

  /**
   * Get all repositories for a specific user
   */
  getUserRepositories(userId: string): Observable<Repository[]> {
    return this.http.get<Repository[]>(`${this.baseUrl}/admin/users/${userId}/repositories`);
  }

  /**
   * Get all tasks for a specific user
   */
  getUserTasks(userId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/admin/users/${userId}/tasks`);
  }

  /**
   * Get GitHub repository details
   */
  getGitHubRepositoryDetails(repositoryId: string): Observable<GitHubRepositoryDetails> {
    return this.http.get<GitHubRepositoryDetails>(`${this.baseUrl}/github/repositories/${repositoryId}/details`);
  }

  /**
   * Get GitHub repository details by owner and repo name
   */
  getGitHubRepositoryDetailsByName(owner: string, repo: string): Observable<GitHubRepositoryDetails> {
    return this.http.get<GitHubRepositoryDetails>(`${this.baseUrl}/github/repositories/${owner}/${repo}`);
  }

  /**
   * Get repository files and content
   */
  getRepositoryFiles(repositoryId: string, branch?: string, path?: string): Observable<any[]> {
    let params = new HttpParams();
    if (branch) params = params.set('branch', branch);
    if (path) params = params.set('path', path);

    return this.http.get<any[]>(`${this.baseUrl}/repositories/${repositoryId}/files`, { params });
  }

  /**
   * Get file content from repository
   */
  getFileContent(repositoryId: string, filePath: string, branch?: string): Observable<{ content: string; encoding: string }> {
    let params = new HttpParams().set('filePath', filePath);
    if (branch) params = params.set('branch', branch);

    return this.http.get<{ content: string; encoding: string }>(`${this.baseUrl}/repositories/${repositoryId}/file-content`, { params });
  }

  /**
   * Get repository commits
   */
  getRepositoryCommits(repositoryId: string, branch?: string, page: number = 0): Observable<any> {
    let params = new HttpParams().set('page', page.toString());
    if (branch) params = params.set('branch', branch);

    return this.http.get<any>(`${this.baseUrl}/repositories/${repositoryId}/commits`, { params });
  }

  /**
   * Get repository branches
   */
  getRepositoryBranches(repositoryId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/repositories/${repositoryId}/branches`);
  }

  /**
   * Search repositories across all users (admin only)
   */
  searchRepositories(query: string, page: number = 0, size: number = 10): Observable<{
    content: Repository[];
    totalElements: number;
    totalPages: number;
  }> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<{
      content: Repository[];
      totalElements: number;
      totalPages: number;
    }>(`${this.baseUrl}/admin/repositories/search`, { params });
  }

  /**
   * Get all repositories (admin only)
   */
  getAllRepositories(page: number = 0, size: number = 10): Observable<{
    content: Repository[];
    totalElements: number;
    totalPages: number;
  }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<{
      content: Repository[];
      totalElements: number;
      totalPages: number;
    }>(`${this.baseUrl}/admin/repositories`, { params });
  }

  /**
   * Get repository statistics
   */
  getRepositoryStats(repositoryId: string): Observable<{
    totalCommits: number;
    totalBranches: number;
    totalContributors: number;
    lastActivity: string;
    languages: { [key: string]: number };
    weeklyActivity: Array<{ date: string; commits: number }>;
  }> {
    return this.http.get<any>(`${this.baseUrl}/repositories/${repositoryId}/stats`);
  }

  /**
   * Sync repository data from GitHub
   */
  syncRepositoryData(repositoryId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/repositories/${repositoryId}/sync`, {});
  }

  /**
   * Manually trigger repository fetching for a specific user
   */
  fetchUserRepositories(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users/${userId}/fetch-repositories`, {});
  }

  /**
   * Manually trigger repository fetching for all users
   */
  fetchAllRepositories(): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users/fetch-all-repositories`, {});
  }

  /**
   * Get bulk fetch status
   */
  getBulkFetchStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users/fetch-all-repositories/status`);
  }

  /**
   * Get webhook delivery history for repository
   */
  getWebhookDeliveries(repositoryId: string): Observable<Array<{
    id: string;
    eventType: string;
    deliveredAt: string;
    success: boolean;
    statusCode?: number;
    error?: string;
  }>> {
    return this.http.get<any[]>(`${this.baseUrl}/repositories/${repositoryId}/webhook-deliveries`);
  }
}
