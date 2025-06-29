import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { GitHubService } from '../../../services/github.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly githubService: GitHubService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, this.espritEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Redirect if already logged in, but check GitHub token first
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        console.log('User already logged in:', user);
        console.log('Has GitHub token:', user.hasGithubToken);
        
        if (!user.hasGithubToken) {
          console.log('User logged in but no GitHub token, redirecting to GitHub OAuth');
          this.redirectToGitHub();
        } else {
          console.log('User logged in with GitHub token, redirecting to dashboard');
          this.redirectToDashboard();
        }
      }
    }
  }

  // Custom validator for Esprit email domain
  espritEmailValidator(control: any) {
    const email = control.value;
    if (email && !email.endsWith('@esprit.tn')) {
      return { espritEmail: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = this.loginForm.value;
      
      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          console.log('User data:', response.user);
          console.log('Has GitHub token:', response.user.hasGithubToken);
          this.isLoading = false;
          
          // Check if user has GitHub token
          if (!response.user.hasGithubToken) {
            console.log('No GitHub token found, redirecting to GitHub OAuth');
            this.redirectToGitHub();
          } else {
            console.log('User has GitHub token, redirecting to dashboard');
            this.redirectToDashboard();
          }
        },
        error: (error) => {
          console.error('Login failed:', error);
          this.isLoading = false;
          this.errorMessage = this.getErrorMessage(error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private getErrorMessage(error: any): string {
    if (error.status === 401) {
      return 'Invalid email or password. Please try again.';
    } else if (error.status === 403) {
      return 'Your account is not activated. Please contact administration.';
    } else if (error.status === 0) {
      return 'Unable to connect to the server. Please check your connection.';
    } else {
      return 'An unexpected error occurred. Please try again later.';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  private redirectToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private redirectToGitHub(): void {
    console.log('Redirecting to GitHub OAuth...');
    this.githubService.redirectToGitHub();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Getter methods for template
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
