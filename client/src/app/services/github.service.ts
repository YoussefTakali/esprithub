import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse } from './auth.service';

export interface GitHubTokenRequest {
  code: string;
  state: string;
}

export interface GitHubAuthUrl {
  authUrl: string;
  state: string;
}

@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private readonly API_URL = 'http://localhost:8090/api/v1';

  constructor(private readonly http: HttpClient) {}

  getGitHubAuthUrl(): Observable<GitHubAuthUrl> {
    return this.http.get<GitHubAuthUrl>(`${this.API_URL}/github/auth-url`);
  }

  linkGitHubAccount(request: GitHubTokenRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/github/link`, request);
  }

  validateGitHubToken(): Observable<{ valid: boolean }> {
    return this.http.get<{ valid: boolean }>(`${this.API_URL}/auth/github/validate`);
  }

  redirectToGitHub(): void {
    this.getGitHubAuthUrl().subscribe({
      next: (response) => {
        console.log('GitHub auth URL response:', response);
        // Store state for verification
        localStorage.setItem('github_oauth_state', response.state);
        // Redirect to GitHub
        window.location.href = response.authUrl;
      },
      error: (error) => {
        console.error('Failed to get GitHub auth URL:', error);
        
        // More specific error handling
        if (error.status === 0) {
          alert('Cannot connect to server. Please make sure the backend is running.');
        } else if (error.status === 500) {
          alert('Server configuration error. Please check GitHub OAuth settings.');
        } else {
          alert('Failed to initialize GitHub authentication. Error: ' + (error.error?.message ?? error.message));
        }
      }
    });
  }

  // Check if GitHub token exists and is valid
  checkGitHubTokenStatus(): Observable<{ valid: boolean; hasToken: boolean }> {
    return this.http.get<{ valid: boolean; hasToken: boolean }>(`${this.API_URL}/auth/github/status`);
  }
}
