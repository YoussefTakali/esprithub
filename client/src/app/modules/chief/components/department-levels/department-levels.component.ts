import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AcademicService } from '../../../../shared/services/academic.service';
import { Niveau, CreateNiveau, User, UserRole, Course, CourseAssignment, CreateCourseAssignment, UserSummary } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-department-levels',
  templateUrl: './department-levels.component.html',
  styleUrls: ['./department-levels.component.css']
})
export class DepartmentLevelsComponent implements OnInit {
  currentUser?: User;
  levels: Niveau[] = [];
  filteredLevels: Niveau[] = [];
  levelForm!: FormGroup;
  searchTerm = '';
  showForm = false;
  editingLevel?: Niveau;
  loading = true;
  saving = false;
  error = '';
  success = '';
  showAssignmentDialog = false;
  selectedLevel: Niveau | null = null;
  assignments: CourseAssignment[] = [];
  courses: Course[] = [];
  teachers: UserSummary[] = [];
  assignmentLoading = false;
  assignmentError: string | null = null;
  assignmentForm: CreateCourseAssignment = { courseId: '', niveauId: '', teacherId: '' };

  constructor(
    private readonly fb: FormBuilder,
    private readonly academicService: AcademicService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadLevels();
  }

  private initForm() {
    this.levelForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      annee: ['', [Validators.required, Validators.min(1), Validators.max(5)]]
    });
  }

  private async loadLevels() {
    try {
      this.loading = true;
      this.error = '';
      // Use chief endpoint for levels
      this.academicService.getMyDepartmentNiveaux().subscribe({
        next: (levels) => {
          this.levels = levels;
          this.filteredLevels = levels;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading levels:', err);
          this.error = 'Failed to load department levels.';
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('Error loading levels:', error);
      this.error = 'Failed to load levels.';
      this.loading = false;
    }
  }

  filterLevels() {
    if (!this.searchTerm.trim()) {
      this.filteredLevels = this.levels;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredLevels = this.levels.filter(level =>
        level.nom.toLowerCase().includes(term) ||
        level.code.toLowerCase().includes(term) ||
        level.annee.toString().includes(term)
      );
    }
  }

  openCreateForm() {
    this.editingLevel = undefined;
    this.levelForm.reset();
    this.showForm = true;
  }

  openEditForm(level: Niveau) {
    this.editingLevel = level;
    this.levelForm.patchValue({
      nom: level.nom,
      description: level.description ?? '',
      annee: level.annee
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingLevel = undefined;
    this.levelForm.reset();
  }

  async onSubmit() {
    if (this.levelForm.invalid) {
      this.markFormGroupTouched();
      return;
    }
    try {
      this.saving = true;
      this.error = '';
      this.success = '';
      const formData = this.levelForm.value;
      // On ne garde que les champs utiles pour le chief
      const payload = {
        nom: formData.nom,
        annee: formData.annee,
        description: formData.description,
        departementId: '' // champ factice pour satisfaire TypeScript
      };
      if (this.editingLevel) {
        // Update existing level
        this.academicService.updateNiveauInMyDepartment(this.editingLevel.id, payload).subscribe({
          next: (updatedLevel) => {
            const index = this.levels.findIndex(l => l.id === updatedLevel.id);
            if (index !== -1) {
              this.levels[index] = updatedLevel;
              this.filterLevels();
            }
            this.success = 'Level updated successfully!';
            this.closeForm();
            this.saving = false;
            setTimeout(() => this.success = '', 3000);
          },
          error: (err) => {
            console.error('Error updating level:', err);
            this.error = 'Failed to update level.';
            this.saving = false;
          }
        });
      } else {
        // Create new level
        this.academicService.createNiveauInMyDepartment(payload).subscribe({
          next: (newLevel) => {
            this.levels.unshift(newLevel);
            this.filterLevels();
            this.success = 'Level created successfully!';
            this.closeForm();
            this.saving = false;
            setTimeout(() => this.success = '', 3000);
          },
          error: (err) => {
            console.error('Error creating level:', err);
            this.error = 'Failed to create level.';
            this.saving = false;
          }
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      this.error = 'An unexpected error occurred.';
      this.saving = false;
    }
  }

  async deleteLevel(level: Niveau) {
    if (!confirm(`Are you sure you want to delete "${level.nom}"?`)) {
      return;
    }
    try {
      this.academicService.deleteNiveauInMyDepartment(level.id).subscribe({
        next: () => {
          this.levels = this.levels.filter(l => l.id !== level.id);
          this.filterLevels();
          this.success = 'Level deleted successfully!';
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          console.error('Error deleting level:', err);
          this.error = 'Failed to delete level.';
        }
      });
    } catch (error) {
      console.error('Error deleting level:', error);
      this.error = 'Failed to delete level.';
    }
  }

  async onManageAssignments(level: Niveau) {
    this.selectedLevel = level;
    this.showAssignmentDialog = true;
    this.assignmentLoading = true;
    this.assignmentError = null;
    this.assignmentForm = { courseId: '', niveauId: level.id, teacherId: '' };
    try {
      const [assignments, courses, teachers] = await Promise.all([
        this.academicService.getCourseAssignmentsByNiveau(level.id).toPromise(),
        this.academicService.getCoursesByNiveau(level.id).toPromise(),
        this.academicService.getUsersByRole('TEACHER').toPromise()
      ]);
      this.assignments = assignments ?? [];
      this.courses = courses ?? [];
      // Only teachers in the chief's department (fallback to departementNom string match)
      this.teachers = (teachers ?? []).filter(t => t.departementNom === this.selectedLevel?.departementNom);
    } catch (error: any) {
      console.error(error);
      this.assignmentError = 'Failed to load assignments, courses, or teachers.';
    } finally {
      this.assignmentLoading = false;
    }
  }

  async addAssignment() {
    if (!this.assignmentForm.courseId || !this.assignmentForm.teacherId) return;
    this.assignmentLoading = true;
    try {
      const assignment = await this.academicService.createCourseAssignment(this.assignmentForm).toPromise();
      if (assignment) this.assignments.push(assignment);
      this.assignmentForm.courseId = '';
      this.assignmentForm.teacherId = '';
      this.success = 'Assignment added!';
      setTimeout(() => this.success = '', 2000);
    } catch (error: any) {
      console.error(error);
      this.assignmentError = 'Failed to add assignment.';
    } finally {
      this.assignmentLoading = false;
    }
  }

  async removeAssignment(assignmentId: string) {
    if (!confirm('Remove this assignment?')) return;
    this.assignmentLoading = true;
    try {
      await this.academicService.deleteCourseAssignment(assignmentId).toPromise();
      this.assignments = this.assignments.filter(a => a.id !== assignmentId);
      this.success = 'Assignment removed!';
      setTimeout(() => this.success = '', 2000);
    } catch (error: any) {
      console.error(error);
      this.assignmentError = 'Failed to remove assignment.';
    } finally {
      this.assignmentLoading = false;
    }
  }

  closeAssignmentDialog() {
    this.showAssignmentDialog = false;
    this.selectedLevel = null;
  }

  private markFormGroupTouched() {
    Object.keys(this.levelForm.controls).forEach(key => {
      const control = this.levelForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.levelForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.levelForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  refresh() {
    this.loadLevels();
  }
}
