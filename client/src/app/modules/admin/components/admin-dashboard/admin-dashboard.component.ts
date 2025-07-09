import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../../shared/services/user.service';
import { AcademicService } from '../../../../shared/services/academic.service';
import { User, UserRole, Departement } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  stats = {
    totalUsers: 0,
    totalDepartments: 0,
    totalLevels: 0,
    totalClasses: 0,
    usersByRole: {
      [UserRole.ADMIN]: 0,
      [UserRole.CHIEF]: 0,
      [UserRole.TEACHER]: 0,
      [UserRole.STUDENT]: 0
    }
  };

  recentUsers: User[] = [];
  recentDepartments: Departement[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private readonly userService: UserService,
    private readonly academicService: AcademicService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      // Load statistics
      await Promise.all([
        this.loadUserStats(),
        this.loadAcademicStats(),
        this.loadRecentData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.error = 'Failed to load dashboard data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private async loadUserStats(): Promise<void> {
    try {
      const users = await firstValueFrom(this.userService.getAllUsers());
      this.stats.totalUsers = users?.length ?? 0;
      
      // Reset counters
      this.stats.usersByRole = {
        [UserRole.ADMIN]: 0,
        [UserRole.CHIEF]: 0,
        [UserRole.TEACHER]: 0,
        [UserRole.STUDENT]: 0
      };

      users?.forEach(user => {
        if (user.role && this.stats.usersByRole.hasOwnProperty(user.role)) {
          this.stats.usersByRole[user.role]++;
        }
      });

      // Get recent users (last 5)
      this.recentUsers = users?.slice(-5) ?? [];
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  private async loadAcademicStats(): Promise<void> {
    try {
      const [departments, levels, classes] = await Promise.all([
        firstValueFrom(this.academicService.getAllDepartements()),
        firstValueFrom(this.academicService.getAllNiveaux()),
        firstValueFrom(this.academicService.getAllClasses())
      ]);

      this.stats.totalDepartments = departments?.length ?? 0;
      this.stats.totalLevels = levels?.length ?? 0;
      this.stats.totalClasses = classes?.length ?? 0;

      // Get recent departments (last 3)
      this.recentDepartments = departments?.slice(-3) ?? [];
    } catch (error) {
      console.error('Error loading academic stats:', error);
    }
  }

  private async loadRecentData(): Promise<void> {
    // Additional recent data loading if needed
  }

  onRefresh(): void {
    this.loadDashboardData();
  }

  getUserRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.CHIEF]: 'Department Chief',
      [UserRole.TEACHER]: 'Teacher',
      [UserRole.STUDENT]: 'Student'
    };
    return roleNames[role] ?? role;
  }
}
