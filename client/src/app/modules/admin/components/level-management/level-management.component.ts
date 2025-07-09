import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademicService } from '../../../../shared/services/academic.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { Niveau, CreateNiveau, Departement, Course, CourseAssignment, CreateCourseAssignment, UserSummary } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-level-management',
  templateUrl: './level-management.component.html',
  styleUrls: ['./level-management.component.css']
})
export class LevelManagementComponent implements OnInit {
  levels: Niveau[] = [];
  departments: Departement[] = [];
  assignments: CourseAssignment[] = [];
  courses: Course[] = [];
  teachers: UserSummary[] = [];
  
  loading = true;
  saving = false;
  error: string | null = null;
  
  showCreateForm = false;
  editingLevel: Niveau | null = null;
  selectedDepartmentId: string | null = null;
  
  createForm: CreateNiveau = {
    nom: '',
    description: '',
    annee: 1,
    departementId: ''
  };

  showAssignmentDialog = false;
  selectedLevel: Niveau | null = null;
  assignmentLoading = false;
  assignmentError: string | null = null;
  assignmentForm: CreateCourseAssignment = { courseId: '', niveauId: '', teacherId: '' };

  constructor(
    private readonly academicService: AcademicService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const [levels, departments] = await Promise.all([
        firstValueFrom(this.academicService.getAllNiveaux()),
        firstValueFrom(this.academicService.getAllDepartements())
      ]);
      
      this.levels = levels ?? [];
      this.departments = departments ?? [];
    } catch (error) {
      console.error('Error loading levels:', error);
      this.error = 'Failed to load levels. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async loadLevelsByDepartment(departmentId: string): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const levels = await firstValueFrom(
        this.academicService.getNiveauxByDepartement(departmentId)
      );
      
      this.levels = levels ?? [];
    } catch (error) {
      console.error('Error loading levels by department:', error);
      this.error = 'Failed to load levels. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  onDepartmentFilter(departmentId: string | null): void {
    this.selectedDepartmentId = departmentId;
    if (departmentId) {
      this.loadLevelsByDepartment(departmentId);
    } else {
      this.loadData();
    }
  }

  onCreateLevel(): void {
    this.showCreateForm = true;
    this.editingLevel = null;
    this.resetCreateForm();
  }

  onEditLevel(level: Niveau): void {
    this.editingLevel = level;
    this.showCreateForm = true;
    this.createForm = {
      nom: level.nom,
      description: level.description ?? '',
      annee: level.annee,
      departementId: level.departementId
    };
  }

  onCancelForm(): void {
    this.showCreateForm = false;
    this.editingLevel = null;
    this.resetCreateForm();
  }

  async onSubmitForm(): Promise<void> {
    if (!this.createForm.nom.trim() || !this.createForm.departementId) {
      this.error = 'Level name and department are required.';
      return;
    }

    try {
      this.saving = true;
      this.error = null;

      if (this.editingLevel) {
        await firstValueFrom(
          this.academicService.updateNiveau(this.editingLevel.id, this.createForm)
        );
        this.snackbarService.showSuccess('Level updated successfully!');
      } else {
        await firstValueFrom(
          this.academicService.createNiveau(this.createForm)
        );
        this.snackbarService.showSuccess('Level created successfully!');
      }

      if (this.selectedDepartmentId) {
        await this.loadLevelsByDepartment(this.selectedDepartmentId);
      } else {
        await this.loadData();
      }
      this.onCancelForm();
    } catch (error) {
      console.error('Error saving level:', error);
      this.snackbarService.showError(`Failed to ${this.editingLevel ? 'update' : 'create'} level. Please try again.`);
      this.error = `Failed to ${this.editingLevel ? 'update' : 'create'} level. Please try again.`;
    } finally {
      this.saving = false;
    }
  }

  async onDeleteLevel(level: Niveau): Promise<void> {
    const confirmMsg = `Are you sure you want to permanently delete the level "${level.nom}"?\n\nThis action cannot be undone. All classes in this level must be deleted first.`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      this.saving = true;
      this.error = null;
      await firstValueFrom(
        this.academicService.deleteNiveau(level.id)
      );
      this.snackbarService.showSuccess('Level deleted successfully!');
      if (this.selectedDepartmentId) {
        await this.loadLevelsByDepartment(this.selectedDepartmentId);
      } else {
        await this.loadData();
      }
      this.onCancelForm();
    } catch (error: any) {
      console.error('Error deleting level:', error);
      // Ajout d'un message explicatif professionnel
      if (error?.error?.message?.includes('Impossible de supprimer le niveau car il contient des classes')) {
        this.snackbarService.showError('Cannot delete this level because it still contains classes. Please delete all classes in this level first.');
      } else {
        this.snackbarService.showError('Failed to delete level. Please try again.');
      }
      this.error = 'Failed to delete level. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  async onDeleteClass(classe: any): Promise<void> {
    const confirmMsg = `Are you sure you want to permanently delete the class "${classe.nom}"?\n\nThis action cannot be undone. All students must be removed from this class first.`;
    if (!confirm(confirmMsg)) {
      return;
    }
    try {
      this.saving = true;
      this.error = null;
      await firstValueFrom(
        this.academicService.deleteClasse(classe.id)
      );
      this.snackbarService.showSuccess('Class deleted successfully!');
      // Reload levels or classes as needed
      if (this.selectedLevel) {
        await this.onManageAssignments(this.selectedLevel);
      } else {
        await this.loadData();
      }
    } catch (error: any) {
      console.error('Error deleting class:', error);
      // Ajout d'un message explicatif professionnel
      if (error?.error?.message?.includes('Impossible de supprimer la classe car elle contient des étudiants')) {
        this.snackbarService.showError('Cannot delete this class because it still contains students. Please remove all students from this class first.');
      } else {
        this.snackbarService.showError('Failed to delete class. Please try again.');
      }
      this.error = 'Failed to delete class. Please try again.';
    } finally {
      this.saving = false;
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
        firstValueFrom(this.academicService.getCourseAssignmentsByNiveau(level.id)),
        firstValueFrom(this.academicService.getCoursesByNiveau(level.id)),
        firstValueFrom(this.academicService.getUsersByRole('TEACHER'))
      ]);
      this.assignments = assignments ?? [];
      this.courses = courses ?? [];
      this.teachers = teachers ?? [];
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
      const assignment = await firstValueFrom(this.academicService.createCourseAssignment(this.assignmentForm));
      this.assignments.push(assignment);
      this.assignmentForm.courseId = '';
      this.assignmentForm.teacherId = '';
      this.snackbarService.showSuccess('Assignment added!');
    } catch (error: any) {
      console.error(error);
      this.snackbarService.showError('Failed to add assignment.');
    } finally {
      this.assignmentLoading = false;
    }
  }

  async removeAssignment(assignmentId: string) {
    if (!confirm('Remove this assignment?')) return;
    this.assignmentLoading = true;
    try {
      await firstValueFrom(this.academicService.deleteCourseAssignment(assignmentId));
      this.assignments = this.assignments.filter(a => a.id !== assignmentId);
      this.snackbarService.showSuccess('Assignment removed!');
    } catch (error: any) {
      console.error(error);
      this.snackbarService.showError('Failed to remove assignment.');
    } finally {
      this.assignmentLoading = false;
    }
  }

  closeAssignmentDialog() {
    this.showAssignmentDialog = false;
    this.selectedLevel = null;
  }

  private resetCreateForm(): void {
    this.createForm = {
      nom: '',
      description: '',
      annee: 1,
      departementId: this.selectedDepartmentId ?? ''
    };
  }

  getDepartmentName(departmentId: string): string {
    const department = this.departments.find(d => d.id === departmentId);
    return department?.nom ?? 'Unknown Department';
  }

  getYearDisplayName(year: number): string {
    const yearNames: Record<number, string> = {
      1: '1st Year',
      2: '2nd Year',
      3: '3rd Year',
      4: '4th Year',
      5: '5th Year'
    };
    return yearNames[year] ?? `${year}th Year`;
  }
}
