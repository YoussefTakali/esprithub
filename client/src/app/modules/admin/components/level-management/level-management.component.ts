import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademicService } from '../../../../shared/services/academic.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { Niveau, CreateNiveau, Departement } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-level-management',
  templateUrl: './level-management.component.html',
  styleUrls: ['./level-management.component.css']
})
export class LevelManagementComponent implements OnInit {
  levels: Niveau[] = [];
  departments: Departement[] = [];
  
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
    if (!confirm(`Are you sure you want to delete the level "${level.nom}"?`)) {
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
    } catch (error) {
      console.error('Error deleting level:', error);
      this.snackbarService.showError('Failed to delete level. Please try again.');
      this.error = 'Failed to delete level. Please try again.';
    } finally {
      this.saving = false;
    }
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
