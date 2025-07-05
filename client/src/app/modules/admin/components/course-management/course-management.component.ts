import { Component, OnInit } from '@angular/core';
import { AcademicService } from '../../../../shared/services/academic.service';
import { Departement, Niveau, Course } from '../../../../shared/models/academic.models';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { MatDialog } from '@angular/material/dialog';
import { CourseCreateDialogComponent } from './course-create-dialog.component';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.css']
})
export class CourseManagementComponent implements OnInit {
  departments: Departement[] = [];
  niveaux: Niveau[] = [];
  courses: Course[] = [];
  loading = true;
  error: string | null = null;
  selectedDepartmentId: string = '';
  selectedNiveauId: string = '';

  constructor(
    private readonly academicService: AcademicService,
    private readonly snackbarService: SnackbarService,
    private readonly dialog: MatDialog,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  async loadDepartments() {
    try {
      this.loading = true;
      this.error = null;
      const user = this.authService.getCurrentUser();
      let departments;
      if (user?.role === 'CHIEF' && (user as any).departementId) {
        // Chiefs only see their own department
        const dept = await this.academicService.getDepartementById((user as any).departementId).toPromise();
        departments = dept ? [dept] : [];
      } else {
        departments = await this.academicService.getAllDepartements().toPromise();
      }
      this.departments = departments ?? [];
      if (this.departments.length > 0) {
        this.selectedDepartmentId = this.departments[0].id;
        await this.onDepartmentChange(this.selectedDepartmentId);
      }
    } catch (e) {
      this.error = 'Failed to load departments.';
    } finally {
      this.loading = false;
    }
  }

  async onDepartmentChange(departmentId: string) {
    this.selectedDepartmentId = departmentId;
    this.niveaux = [];
    this.selectedNiveauId = '';
    if (!departmentId) return;
    try {
      this.loading = true;
      const niveaux = await this.academicService.getNiveauxByDepartement(departmentId).toPromise();
      this.niveaux = niveaux ?? [];
      if (this.niveaux.length > 0) {
        this.selectedNiveauId = this.niveaux[0].id;
        await this.onNiveauChange(this.selectedNiveauId);
      }
    } catch (e) {
      this.error = 'Failed to load levels.';
    } finally {
      this.loading = false;
    }
  }

  async onNiveauChange(niveauId: string) {
    this.selectedNiveauId = niveauId;
    if (!niveauId) return;
    try {
      this.loading = true;
      const courses = await this.academicService.getCoursesByNiveau(niveauId).toPromise();
      this.courses = courses ?? [];
    } catch (e) {
      this.courses = [];
    } finally {
      this.loading = false;
    }
  }

  async openCreateDialog() {
    const dialogRef = this.dialog.open(CourseCreateDialogComponent, {
      width: '400px',
      data: {
        departments: this.departments,
        niveauxByDepartment: async (id: string) => {
          return await this.academicService.getNiveauxByDepartement(id).toPromise() ?? [];
        }
      }
    });
    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      await this.createCourse(result);
    }
  }

  async createCourse(form: { name: string; description: string; niveauId: string }) {
    if (!form.name.trim() || !form.niveauId) return;
    try {
      this.loading = true;
      const newCourse = await this.academicService.createCourse(form).toPromise();
      this.snackbarService.showSuccess('Course created!');
      this.onNiveauChange(form.niveauId);
    } catch (e) {
      this.snackbarService.showError('Failed to create course.');
    } finally {
      this.loading = false;
    }
  }

  reload(): void {
    this.loadDepartments();
  }

  openEditDialog(course: Course): void {
    // TODO: Implement edit dialog
    if (this.snackbarService) {
      this.snackbarService.showSuccess('Edit dialog not implemented yet.');
    }
  }

  deleteCourse(course: Course): void {
    // TODO: Implement delete logic
    if (this.snackbarService) {
      this.snackbarService.showSuccess('Delete not implemented yet.');
    }
  }

  getNiveauName(niveauId: string): string {
    if (!this.niveaux) return '';
    const niveau = this.niveaux.find((n: any) => n.id === niveauId);
    return niveau ? niveau.nom : '';
  }

  getDepartmentName(): string {
    if (!this.departments) return '';
    const dept = this.departments.find((d: any) => d.id === this.selectedDepartmentId);
    return dept ? dept.nom : '';
  }
}
