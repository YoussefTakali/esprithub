import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    if (this.authService.isLoggedIn()) {
      // Check for role-based access if specified in route data
      const requiredRoles = route.data?.['roles'] as string[];
      
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = this.authService.hasRole(requiredRoles);
        
        if (!hasRequiredRole) {
          // Redirect to appropriate dashboard based on user's actual role
          this.redirectToDashboard();
          return false;
        }
      }
      
      return true;
    }

    // Redirect to login page with return url
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  private redirectToDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      switch (user.role) {
        case 'ADMIN':
          this.router.navigate(['/admin/dashboard']);
          break;
        case 'CHIEF':
          this.router.navigate(['/chief/dashboard']);
          break;
        case 'TEACHER':
          this.router.navigate(['/teacher/dashboard']);
          break;
        case 'STUDENT':
          this.router.navigate(['/student/dashboard']);
          break;
        default:
          this.router.navigate(['/dashboard']);
      }
    }
  }
}
