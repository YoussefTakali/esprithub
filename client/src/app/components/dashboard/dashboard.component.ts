import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { GitHubService } from '../../services/github.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly githubService: GitHubService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    // Redirect admin users to admin dashboard
    if (this.user.role?.toLowerCase() === 'admin') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    // Redirect chief users to chief dashboard (if it exists)
    if (this.user.role?.toLowerCase() === 'chief') {
      this.router.navigate(['/chief/dashboard']);
      return;
    }
  }

  logout(): void {
    this.authService.logout();
  }

  linkGitHub(): void {
    this.githubService.redirectToGitHub();
  }
}
