import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../shared/services/user.service';
import { AcademicService } from '../../../../shared/services/academic.service';
import { User, Departement, Niveau, Classe, UserRole } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-chief-dashboard',
  templateUrl: './chief-dashboard.component.html',
  styleUrls: ['./chief-dashboard.component.css']
})
export class ChiefDashboardComponent implements OnInit {
  currentUser?: User;
  department?: Departement;
  stats = {
    totalLevels: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0
  };
  recentLevels: Niveau[] = [];
  recentClasses: Classe[] = [];
  loading = true;
  error = '';

  constructor(
    private readonly userService: UserService,
    private readonly academicService: AcademicService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      this.loading = true;
      this.error = '';

      // For now, mock current user - in real app, get from auth service
      this.currentUser = {
        id: '1',
        email: 'chief@example.com',
        firstName: 'Chief',
        lastName: 'User',
        role: UserRole.CHIEF,
        isActive: true,
        isEmailVerified: true,
        fullName: 'Chief User',
        canManageUsers: true,
        departementId: '1' // Mock department ID
      };
      
      if (!this.currentUser?.departementId) {
        this.error = 'No department assigned to this chief.';
        return;
      }

      // Load department info
      this.academicService.getDepartementById(this.currentUser.departementId).subscribe({
        next: (dept) => {
          this.department = dept;
          this.loadDepartmentStats();
          this.loadRecentItems();
        },
        error: (err) => {
          console.error('Error loading department:', err);
          this.error = 'Failed to load department information.';
          this.loading = false;
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.error = 'Failed to load dashboard data. Please try again.';
      this.loading = false;
    }
  }

  private loadDepartmentStats() {
    if (!this.currentUser?.departementId) return;

    try {
      // Get levels in department
      this.academicService.getNiveauxByDepartement(this.currentUser.departementId).subscribe({
        next: (levels) => {
          this.stats.totalLevels = levels.length;
        },
        error: (err) => console.error('Error loading levels:', err)
      });

      // Get classes in department
      this.academicService.getClassesByDepartement(this.currentUser.departementId).subscribe({
        next: (classes) => {
          this.stats.totalClasses = classes.length;
        },
        error: (err) => console.error('Error loading classes:', err)
      });

      // Get users in department
      this.userService.getUsersByDepartment(this.currentUser.departementId).subscribe({
        next: (departmentUsers) => {
          this.stats.totalTeachers = departmentUsers.filter((u: User) => u.role === UserRole.TEACHER).length;
          this.stats.totalStudents = departmentUsers.filter((u: User) => u.role === UserRole.STUDENT).length;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading department users:', err);
          this.loading = false;
        }
      });

    } catch (error) {
      console.error('Error loading department stats:', error);
      this.loading = false;
    }
  }

  private loadRecentItems() {
    if (!this.currentUser?.departementId) return;

    try {
      // Get recent levels (limit to 5)
      this.academicService.getNiveauxByDepartement(this.currentUser.departementId).subscribe({
        next: (allLevels) => {
          this.recentLevels = allLevels.slice(0, 5);
        },
        error: (err) => console.error('Error loading recent levels:', err)
      });

      // Get recent classes (limit to 5)
      this.academicService.getClassesByDepartement(this.currentUser.departementId).subscribe({
        next: (allClasses) => {
          this.recentClasses = allClasses.slice(0, 5);
        },
        error: (err) => console.error('Error loading recent classes:', err)
      });

    } catch (error) {
      console.error('Error loading recent items:', error);
    }
  }

  get departmentDisplayName(): string {
    return this.department ? `${this.department.nom} (${this.department.code})` : 'Unknown Department';
  }

  refresh() {
    this.loadDashboardData();
  }
}
