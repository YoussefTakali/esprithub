import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AcademicService } from '../../../../shared/services/academic.service';
import { UserService } from '../../../../shared/services/user.service';
import { Departement, User, UserRole } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-my-department',
  templateUrl: './my-department.component.html',
  styleUrls: ['./my-department.component.css']
})
export class MyDepartmentComponent implements OnInit {
  currentUser?: User;
  department?: Departement;
  departmentForm!: FormGroup;
  loading = true;
  saving = false;
  error = '';
  success = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly academicService: AcademicService,
    private readonly userService: UserService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadDepartmentData();
  }

  private initForm() {
    this.departmentForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      specialite: ['', Validators.required],
      typeFormation: ['', Validators.required],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10)]]
    });
  }

  private async loadDepartmentData() {
    try {
      this.loading = true;
      this.error = '';

      // Mock current user - in real app, get from auth service
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
        departementId: '1'
      };

      // Appel direct à l'API chief pour récupérer le département du chef
      this.academicService.getMyDepartment().subscribe({
        next: (dept) => {
          this.department = dept;
          this.populateForm();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading department:', err);
          this.error = 'Failed to load department information.';
          this.loading = false;
        }
      });

    } catch (error) {
      console.error('Error loading department data:', error);
      this.error = 'Failed to load department data.';
      this.loading = false;
    }
  }

  populateForm() {
    if (this.department) {
      this.departmentForm.patchValue({
        nom: this.department.nom,
        description: this.department.description ?? '',
        specialite: this.department.specialite,
        typeFormation: this.department.typeFormation,
        code: this.department.code
      });
    }
  }

  async onSubmit() {
    if (this.departmentForm.invalid || !this.department) {
      this.markFormGroupTouched();
      return;
    }

    try {
      this.saving = true;
      this.error = '';
      this.success = '';

      const formData = this.departmentForm.value;

      this.academicService.updateMyDepartment(formData).subscribe({
        next: (updatedDept) => {
          this.department = updatedDept;
          this.success = 'Department information updated successfully!';
          this.saving = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          console.error('Error updating department:', err);
          this.error = 'Failed to update department information.';
          this.saving = false;
        }
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      this.error = 'An unexpected error occurred.';
      this.saving = false;
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.departmentForm.controls).forEach(key => {
      const control = this.departmentForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.departmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.departmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }

  refresh() {
    this.loadDepartmentData();
  }
}
