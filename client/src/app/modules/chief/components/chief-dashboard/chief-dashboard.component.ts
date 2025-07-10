import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../shared/services/user.service';
import { AcademicService } from '../../../../shared/services/academic.service';
import { User, Departement, Niveau, Classe, UserRole } from '../../../../shared/models/academic.models';
import { AuthService } from '../../../../services/auth.service';

// Fonction utilitaire pour mapper un User AuthService vers le User principal
function mapAuthUserToAppUser(authUser: any): User {
  return {
    id: authUser.id,
    email: authUser.email,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    role: authUser.role,
    githubUsername: authUser.githubUsername,
    isActive: authUser.isActive !== undefined ? authUser.isActive : true,
    isEmailVerified: authUser.isEmailVerified !== undefined ? authUser.isEmailVerified : true,
    fullName: authUser.fullName || (authUser.firstName + ' ' + authUser.lastName),
    canManageUsers: authUser.canManageUsers !== undefined ? authUser.canManageUsers : false,
    departementId: authUser.departementId
  };
}

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

  // Widgets et UI
  quickSearchTerm: string = '';
  notifications: Array<{ icon: string; text: string; date: string }> = [];
  assignmentProgress: number = 0;
  assignmentsCompleted: number = 0;
  assignmentsTotal: number = 0;
  upcomingEvents: Array<{ title: string; date: Date }> = [];

  constructor(
    private readonly userService: UserService,
    private readonly academicService: AcademicService,
    private readonly authService: AuthService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    // Charger le vrai département du chef
    this.academicService.getMyDepartment().subscribe({
      next: (dept) => {
        this.department = dept;
      },
      error: (err) => {
        this.error = 'Impossible de charger le département';
      }
    });
    // Charger les notifications dynamiques du backend
    this.academicService.getChiefNotifications().subscribe({
      next: (notifications) => this.notifications = notifications.map(n => ({ ...n, date: n.date })),
      error: () => this.notifications = []
    });
    // Widgets pro (mock ou à connecter plus tard)
    this.assignmentProgress = 75;
    this.assignmentsCompleted = 15;
    this.assignmentsTotal = 20;
    this.upcomingEvents = [
      { title: 'Department Meeting', date: new Date(Date.now() + 2*86400000) },
      { title: 'Class Council', date: new Date(Date.now() + 5*86400000) }
    ];
  }

  async loadDashboardData() {
    try {
      this.loading = true;
      this.error = '';

      // Charger l'utilisateur connecté depuis AuthService (toujours à jour)
      const user = this.authService.getCurrentUser();
      if (user) {
        const mappedUser = mapAuthUserToAppUser(user);
        this.userService.setCurrentUser(mappedUser);
        this.currentUser = mappedUser;
      } else {
        // Si non trouvé, tenter de charger depuis l'API /auth/me
        this.authService.getCurrentUserProfile().subscribe({
          next: (profile) => {
            const mappedUser = mapAuthUserToAppUser(profile);
            this.userService.setCurrentUser(mappedUser);
            this.currentUser = mappedUser;
          },
          error: () => {
            this.error = 'Impossible de charger les informations du chef.';
          }
        });
      }

      // Charger le département principal du chef
      this.academicService.getMyDepartment().subscribe({
        next: (dept) => {
          this.department = dept;
          this.loadDepartmentStats();
          this.loadRecentItems();
        },
        error: (err) => {
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

  get chiefName(): string {
    return this.currentUser?.fullName || this.currentUser?.firstName || 'Department Chief';
  }

  get chiefPhotoUrl(): string {
    // Si le backend fournit une photo, l'utiliser, sinon avatar par défaut
    return (this.currentUser && 'photoUrl' in this.currentUser && (this.currentUser as any).photoUrl) ? (this.currentUser as any).photoUrl : 'assets/user.png';
  }

  get chiefEmail(): string {
    return this.currentUser?.email || '';
  }

  get departmentDisplayName(): string {
    return this.department ? `${this.department.nom} (${this.department.code})` : 'Unknown Department';
  }

  refresh() {
    this.loadDashboardData();
  }
}
