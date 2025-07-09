import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, AuthResponse } from '../../../services/auth.service';
import { GitHubService } from '../../../services/github.service';

@Component({
  selector: 'app-github-callback',
  templateUrl: './github-callback.component.html',
  styleUrls: ['./github-callback.component.css']
})
export class GitHubCallbackComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  userEmail = '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly githubService: GitHubService
  ) {}

  ngOnInit(): void {
    // Debug: Check if we have authentication state
    console.log('GitHub Callback Component initialized');
    console.log('LocalStorage contents:', {
      accessToken: !!localStorage.getItem('accessToken'),
      refreshToken: !!localStorage.getItem('refreshToken'),
      user: !!localStorage.getItem('user'),
      email: localStorage.getItem('email')
    });

    const user = this.authService.getCurrentUser();
    if (!user) {
      console.error('No authenticated user found during GitHub callback');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Current user found:', user);
    this.userEmail = user.email;
    this.handleGitHubCallback();
  }

  private handleGitHubCallback(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.isLoading = false;
        this.errorMessage = 'GitHub authorization was denied or failed.';
        return;
      }

      if (code) {
        this.linkGitHubAccount(code, state);
      } else {
        this.isLoading = false;
        this.errorMessage = 'No authorization code received from GitHub.';
      }
    });
  }

  private linkGitHubAccount(code: string, state: string): void {
    // Debug authentication status
    const isLoggedIn = this.authService.isLoggedIn();
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getToken();
    
    console.log('Auth status before GitHub link:', {
      isLoggedIn,
      hasUser: !!currentUser,
      hasToken: !!token,
      userEmail: currentUser?.email,
      tokenPreview: token ? token.substring(0, 20) + '...' : null
    });
    
    if (!isLoggedIn || !currentUser || !token) {
      console.error('Authentication required for GitHub linking');
      this.isLoading = false;
      this.errorMessage = 'Authentication session expired. Please log in again.';
      this.authService.logout();
      return;
    }
    
    const request = { code, state };
    
    this.githubService.linkGitHubAccount(request).subscribe({
      next: (response: AuthResponse) => {
        console.log('GitHub account linked successfully:', response);
        this.isLoading = false;
        
        // Update user data in auth service
        this.authService.updateUserData(response.user);
        
        // Redirect to dashboard
        this.redirectToDashboard();
      },
      error: (error: any) => {
        console.error('Failed to link GitHub account:', error);
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
        
        // Clear user data since GitHub linking is mandatory
        console.log('GitHub linking failed - clearing user session');
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 400) {
      if (error.error?.message?.includes('email')) {
        return error.error.message ?? 'GitHub email does not match your Esprit account email. Please ensure your GitHub account uses the same email address.';
      }
      return error.error?.message ?? 'Invalid GitHub authorization data.';
    } else if (error.status === 409) {
      return 'This GitHub account is already linked to another user.';
    } else if (error.status === 0) {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }
    return 'GitHub authentication failed. Since GitHub integration is mandatory for EspritHub, please try again or contact support.';
  }

  private redirectToDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Role-specific dashboard routing
    switch (user.role) {
      case 'STUDENT':
        this.router.navigate(['/student-dashboard']);
        break;
      case 'TEACHER':
        this.router.navigate(['/teacher-dashboard']);
        break;
      case 'ADMIN':
        this.router.navigate(['/admin-dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  retryGitHubLink(): void {
    this.githubService.redirectToGitHub();
  }

  goBackToLogin(): void {
    // Clear all user data and redirect to login
    this.authService.logout();
  }
}
