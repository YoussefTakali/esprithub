import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../../shared/services/user.service';
import { AcademicService } from '../../../../shared/services/academic.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { User, UserRole, Departement, CreateUser, UpdateUser } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  departments: Departement[] = [];
  userRoles = Object.values(UserRole);
  
  loading = true;
  saving = false;
  error: string | null = null;
  
  showCreateForm = false;
  editingUser: User | null = null;
  
  createForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.STUDENT,
    departementId: undefined as number | undefined
  };

  constructor(
    private readonly userService: UserService,
    private readonly academicService: AcademicService,
    private readonly snackbarService: SnackbarService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const [users, departments] = await Promise.all([
        firstValueFrom(this.userService.getAllUsers()),
        firstValueFrom(this.academicService.getAllDepartements())
      ]);
      
      this.users = users ?? [];
      console.log('Loaded users:', this.users);
      this.departments = departments ?? [];
    } catch (error) {
      console.error('Error loading users:', error);
      this.error = 'Failed to load users. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  onCreateUser(): void {
    this.showCreateForm = true;
    this.editingUser = null;
    this.resetCreateForm();
  }

  onViewUser(user: User): void {
    console.log('Navigating to user details:', user);
    console.log('User ID:', user.id);
    if (user.id) {
      this.router.navigate(['/admin/users', user.id]);
    } else {
      console.error('User ID is missing!', user);
    }
  }

  onEditUser(user: User): void {
    this.editingUser = user;
    this.showCreateForm = true;
    this.createForm = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // Don't pre-fill password for security
      role: user.role,
      departementId: user.departementId ? parseInt(user.departementId) : undefined
    };
  }

  onCancelForm(): void {
    this.showCreateForm = false;
    this.editingUser = null;
    this.resetCreateForm();
  }

  async onSubmitForm(): Promise<void> {
    if (!this.createForm.firstName.trim() || !this.createForm.lastName.trim() || !this.createForm.email.trim()) {
      this.error = 'First name, last name, and email are required.';
      return;
    }

    if (!this.editingUser && !this.createForm.password.trim()) {
      this.error = 'Password is required for new users.';
      return;
    }

    try {
      this.saving = true;
      this.error = null;

      if (this.editingUser) {
        // Update existing user
        const updateDto: UpdateUser = {
          firstName: this.createForm.firstName,
          lastName: this.createForm.lastName,
          email: this.createForm.email,
          role: this.createForm.role
        };
        await firstValueFrom(
          this.userService.updateUser(this.editingUser.id, updateDto)
        );
        this.snackbarService.showSuccess('User updated successfully!');
      } else {
        // Create new user
        const createDto: CreateUser = {
          firstName: this.createForm.firstName,
          lastName: this.createForm.lastName,
          email: this.createForm.email,
          password: this.createForm.password,
          role: this.createForm.role
        };
        await firstValueFrom(
          this.userService.createUser(createDto)
        );
        this.snackbarService.showSuccess('User created successfully!');
      }

      await this.loadData();
      this.onCancelForm();
    } catch (error) {
      console.error('Error saving user:', error);
      this.snackbarService.showError(`Failed to ${this.editingUser ? 'update' : 'create'} user. Please try again.`);
      this.error = `Failed to ${this.editingUser ? 'update' : 'create'} user. Please try again.`;
    } finally {
      this.saving = false;
    }
  }

  async onDeleteUser(user: User): Promise<void> {
    if (!confirm(`Are you sure you want to delete the user "${user.fullName}"?`)) {
      return;
    }

    try {
      this.saving = true;
      this.error = null;
      
      await firstValueFrom(
        this.userService.deleteUser(user.id)
      );
      this.snackbarService.showSuccess('User deleted successfully!');
      
      await this.loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      this.snackbarService.showError('Failed to delete user. Please try again.');
      this.error = 'Failed to delete user. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  private resetCreateForm(): void {
    this.createForm = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: UserRole.STUDENT,
      departementId: undefined
    };
  }

  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.CHIEF]: 'Department Chief',
      [UserRole.TEACHER]: 'Teacher',
      [UserRole.STUDENT]: 'Student'
    };
    return roleNames[role] ?? role;
  }

  getDepartmentName(departmentId?: string): string {
    if (!departmentId) return 'N/A';
    const department = this.departments.find(d => d.id === departmentId);
    return department?.nom ?? 'Unknown';
  }

  importData(event: Event){
  
}

exportData()
{

}
}


