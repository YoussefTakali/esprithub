import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    githubUsername?: string;
    hasGithubToken: boolean;
    lastLogin: string;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  githubUsername?: string;
  hasGithubToken: boolean;
  lastLogin: string;
  classeNom?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8090/api/v1';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    // Check if user is already logged in on service initialization
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    const token = this.getToken();
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
        
        // Set localStorage items for compatibility with existing components
        localStorage.setItem('firstname', user.firstName);
        localStorage.setItem('lastname', user.lastName);
        localStorage.setItem('role', user.role.toLowerCase());
        localStorage.setItem('id', user.id);
        localStorage.setItem('email', user.email);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Store tokens
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
          localStorage.setItem('firstname', response.user.firstName);
          localStorage.setItem('lastname', response.user.lastName);
          localStorage.setItem('role', response.user.role.toLowerCase());
          localStorage.setItem('id', response.user.id);
          localStorage.setItem('email', response.user.email);
          this.currentUserSubject.next(response.user);
          this.isLoggedInSubject.next(true);

          // Role-based redirect after login
          const role = response.user.role?.toLowerCase();
          switch (role) {
            case 'admin':
              this.router.navigate(['/admin/dashboard']);
              break;
            case 'chief':
              this.router.navigate(['/chief/dashboard']);
              break;
            case 'teacher':
              this.router.navigate(['/teacher/dashboard']);
              break;
            case 'student':
              this.router.navigate(['/dashboard']); // or your student dashboard route
              break;
            default:
              this.router.navigate(['/dashboard']);
          }
        })
      );
  }

  // Update user data after GitHub linking
  updateUserData(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('firstname', user.firstName);
    localStorage.setItem('lastname', user.lastName);
    localStorage.setItem('role', user.role.toLowerCase());
    localStorage.setItem('id', user.id);
    localStorage.setItem('email', user.email);
    
    this.currentUserSubject.next(user);
  }

  logout(): void {
    // Clear all auth data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('firstname');
    localStorage.removeItem('lastname');
    localStorage.removeItem('role');
    localStorage.removeItem('id');
    localStorage.removeItem('email');
    
    // Update observables
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    
    // Navigate to login
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value && !!this.getToken();
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
        })
      );
  }

  validateGitHubToken(): Observable<{ valid: boolean }> {
    return this.http.get<{ valid: boolean }>(`${this.API_URL}/auth/github/validate`);
  }

  getCurrentUserProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/me`);
  }

  // Helper method to get auth headers
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  // Role-based helpers
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  isChief(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'CHIEF';
  }

  isTeacher(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'TEACHER';
  }

  isStudent(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'STUDENT';
  }

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }
}
