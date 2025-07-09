import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademicService } from '../../../../shared/services/academic.service';
import { UserService } from '../../../../shared/services/user.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { AuthService } from '../../../../services/auth.service';
import { Classe, CreateClasse, CreateClasseSimple, Niveau, Departement, User, UserRole } from '../../../../shared/models/academic.models';
import { MatDialog } from '@angular/material/dialog';
import { AssignStudentsDialogComponent } from './assign-students-dialog.component';
import { ShowAllStudentsDialogComponent } from './show-all-students-dialog.component';
 
@Component({
  selector: 'app-class-management',
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.css']
})
export class ClassManagementComponent implements OnInit {
  classes: Classe[] = [];
  levels: Niveau[] = [];
  departments: Departement[] = [];
  teachers: User[] = [];
 
  loading = true;
  saving = false;
  error: string | null = null;
 
  showCreateForm = false;
  editingClass: Classe | null = null;
  selectedDepartmentId: string | null = null;
  selectedLevelId: string | null = null;
 
  createForm: CreateClasse = {
    nom: '',
    description: '',
    niveauId: '',
    capacite: 30
  };
 
  // New form fields for hierarchical creation
  createFormDepartmentId: string = '';
  createFormLevelId: string = '';
  createFormLevels: Niveau[] = [];
 
  constructor(
    private readonly academicService: AcademicService,
    private readonly userService: UserService,
    private readonly snackbarService: SnackbarService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog
  ) {}
 
  ngOnInit(): void {
    this.loadData();
  }
 
  async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      const user = this.authService.getCurrentUser();
      let departments;
      if (user?.role === 'CHIEF' && (user as any).departementId) {
        const dept = await this.academicService.getDepartementById((user as any).departementId).toPromise();
        departments = dept ? [dept] : [];
      } else {
        departments = await firstValueFrom(this.academicService.getAllDepartements());
      }
      this.departments = departments ?? [];
      let levels = [];
      if (this.departments.length > 0) {
        this.selectedDepartmentId = this.departments[0].id;
        levels = await firstValueFrom(this.academicService.getNiveauxByDepartement(this.selectedDepartmentId));
        this.levels = levels ?? [];
        if (this.levels.length > 0) {
          this.selectedLevelId = this.levels[0].id;
          await this.onLevelFilter(this.selectedLevelId);
        }
      }
      this.teachers = await firstValueFrom(this.userService.getUsersByRole(UserRole.TEACHER));
    } catch (error) {
      console.error('Error loading classes:', error);
      this.snackbarService.showError('Failed to load classes. Please try again.');
      this.error = 'Failed to load classes. Please try again.';
    } finally {
      this.loading = false;
    }
  }
 
  async onDepartmentFilter(departmentId: string | null): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'CHIEF' && (user as any).departementId) {
      // Chiefs cannot change department
      return;
    }
    this.selectedDepartmentId = departmentId;
    this.selectedLevelId = null;
   
    if (departmentId) {
      try {
        this.loading = true;
        const levels = await firstValueFrom(
          this.academicService.getNiveauxByDepartement(departmentId)
        );
        this.levels = levels ?? [];
      } catch (error) {
        console.error('Error loading levels:', error);
        this.snackbarService.showError('Failed to load levels for department.');
        this.error = 'Failed to load levels for department.';
      } finally {
        this.loading = false;
      }
    } else {
      this.levels = [];
      await this.loadData();
    }
  }
 
  async onLevelFilter(levelId: string | null): Promise<void> {
    this.selectedLevelId = levelId;
    if (levelId) {
      try {
        this.loading = true;
        const classes = await firstValueFrom(
          this.academicService.getClassesByNiveau(levelId)
        );
        // Normalize students/teachers arrays
        this.classes = (classes ?? []).map(classe => ({
          ...classe,
          students: Array.isArray(classe.students) ? classe.students : [],
          teachers: Array.isArray(classe.teachers) ? classe.teachers : []
        }));
      } catch (error) {
        console.error('Error loading classes:', error);
        this.snackbarService.showError('Failed to load classes for level.');
        this.error = 'Failed to load classes for level.';
      } finally {
        this.loading = false;
      }
    } else if (this.selectedDepartmentId) {
      // Load all classes for the department
      await this.loadClassesByDepartment(this.selectedDepartmentId);
    } else {
      await this.loadData();
    }
  }
 
  private async loadClassesByDepartment(departmentId: string): Promise<void> {
    try {
      this.loading = true;
      const levels = await firstValueFrom(
        this.academicService.getNiveauxByDepartement(departmentId)
      );
      const classPromises = levels?.map(level =>
        firstValueFrom(this.academicService.getClassesByNiveau(level.id))
      ) ?? [];
      const classArrays = await Promise.all(classPromises);
      // Normalize students/teachers arrays
      this.classes = classArrays.flat().filter(Boolean).map(classe => ({
        ...classe,
        students: Array.isArray(classe.students) ? classe.students : [],
        teachers: Array.isArray(classe.teachers) ? classe.teachers : []
      }));
    } catch (error) {
      console.error('Error loading classes by department:', error);
      this.snackbarService.showError('Failed to load classes.');
      this.error = 'Failed to load classes.';
    } finally {
      this.loading = false;
    }
  }
 
  async onCreateClass(): Promise<void> {
    this.showCreateForm = true;
    this.editingClass = null;
    const user = this.authService.getCurrentUser();
    if (user?.role === 'CHIEF' && (user as any).departementId) {
      this.createFormDepartmentId = (user as any).departementId;
      await this.onDepartmentSelectedForCreate(this.createFormDepartmentId);
    } else {
      this.resetCreateForm();
    }
  }
 
 
 
onDepartmentSelectedForCreate(eventOrId: Event | string): void {
  let value: string;
  if (typeof eventOrId === 'string') {
    value = eventOrId;
  } else {
    value = (eventOrId.target as HTMLSelectElement).value;
  }
  this.createFormDepartmentId = value;
  this.createFormLevelId = '';
  this.createForm.niveauId = '';
  if (value) {
    this.loadLevelsForDepartment(value);
  } else {
    this.createFormLevels = [];
  }
}
 
private async loadLevelsForDepartment(departmentId: string): Promise<void> {
  try {
    this.loading = true;
    const levels = await firstValueFrom(
      this.academicService.getNiveauxByDepartement(departmentId)
    );
    this.createFormLevels = levels ?? [];
  } catch (error) {
    console.error('Error loading levels for create form:', error);
    this.snackbarService.showError('Failed to load levels for selected department.');
    this.error = 'Failed to load levels for selected department.';
    this.createFormLevels = [];
  } finally {
    this.loading = false;
  }
}
 
  onEditClass(classe: Classe): void {
    this.editingClass = classe;
    this.showCreateForm = true;
    this.createForm = {
      nom: classe.nom,
      description: classe.description ?? '',
      niveauId: classe.niveauId,
      capacite: classe.capacite ?? 30
    };
    // Set department and level for editing
    this.createFormDepartmentId = classe.departementId ?? '';
    this.createFormLevelId = classe.niveauId ?? '';
    // Optionally, load levels for the department
    if (this.createFormDepartmentId) {
      this.onDepartmentSelectedForCreate(this.createFormDepartmentId);
    }
  }
 
  onCancelForm(): void {
    this.showCreateForm = false;
    this.editingClass = null;
    this.error = null; // Clear error on cancel
    this.resetCreateForm();
  }
 
  async onSubmitForm(): Promise<void> {
    if (!this.createForm.nom.trim() || !this.createFormDepartmentId || !this.createForm.niveauId) {
      this.snackbarService.showError('Class name, department, and level are required.');
      this.error = 'Class name, department, and level are required.';
      return;
    }
 
    try {
      this.saving = true;
      this.error = null;
      const prevDepartmentId = this.createFormDepartmentId;
      const prevLevelId = this.createFormLevelId;
 
      if (this.editingClass) {
        await firstValueFrom(
          this.academicService.updateClasse(this.editingClass.id, this.createForm)
        );
        this.snackbarService.showSuccess('Class updated successfully!');
      } else {
        const createClasseData: any = {
          nom: this.createForm.nom,
          description: this.createForm.description,
          capacite: this.createForm.capacite,
          isActive: true
        };
        await firstValueFrom(
          this.academicService.createClasseForNiveau(
            this.createFormDepartmentId,
            this.createForm.niveauId,
            createClasseData
          )
        );
        this.snackbarService.showSuccess('Class created successfully!');
      }
 
      // Preserve department and level selection after create/update
      this.selectedDepartmentId = prevDepartmentId;
      this.selectedLevelId = prevLevelId;
      await this.refreshCurrentView();
      this.error = null; // Clear error after successful add/update
      this.onCancelForm();
    } catch (error) {
      console.error('Error saving class:', error);
      this.snackbarService.showError(`Failed to ${this.editingClass ? 'update' : 'create'} class. Please try again.`);
      this.error = `Failed to ${this.editingClass ? 'update' : 'create'} class. Please try again.`;
    } finally {
      this.saving = false;
    }
  }
 
  async onDeleteClass(classe: Classe): Promise<void> {
    if (!confirm(`Are you sure you want to delete the class "${classe.nom}"?`)) {
      return;
    }
 
    try {
      this.saving = true;
      this.error = null;
     
      await firstValueFrom(
        this.academicService.deleteClasse(classe.id)
      );
      this.snackbarService.showSuccess('Class deleted successfully!');
     
      await this.refreshCurrentView();
    } catch (error) {
      console.error('Error deleting class:', error);
      this.snackbarService.showError('Failed to delete class. Please try again.');
      this.error = 'Failed to delete class. Please try again.';
    } finally {
      this.saving = false;
    }
  }
 
  async onAssignStudents(classe: Classe): Promise<void> {
    try {
      // Fetch all students (optionally filter by department/level)
      const allStudents = await firstValueFrom(this.userService.getUsersByRole(UserRole.STUDENT));
      // Exclude students already assigned to any class
      const availableStudents = allStudents.filter((s: any) => !s.classeId);
      const dialogRef = this.dialog.open(AssignStudentsDialogComponent, {
        width: '400px',
        data: { students: availableStudents }
      });
      dialogRef.afterClosed().subscribe(async (selectedIds: string[]) => {
        if (selectedIds && selectedIds.length > 0) {
          try {
            this.saving = true;
            await firstValueFrom(this.academicService.assignStudentsToClasse(classe.id, selectedIds));
            this.snackbarService.showSuccess('Students assigned successfully!');
            await this.refreshCurrentView();
          } catch (err) {
            this.snackbarService.showError('Failed to assign students.');
          } finally {
            this.saving = false;
          }
        }
      });
    } catch (err) {
      this.snackbarService.showError('Failed to load students.');
    }
  }
 
  async onShowAllStudents(): Promise<void> {
    try {
      const students = await firstValueFrom(this.userService.getUsersByRole(UserRole.STUDENT));
      this.dialog.open(ShowAllStudentsDialogComponent, {
        width: '600px',
        data: { students }
      });
    } catch (err) {
      this.snackbarService.showError('Failed to load students.');
    }
  }
 
  async onShowClassStudents(classe: Classe): Promise<void> {
    try {
      const students = await firstValueFrom(this.userService.getUsersByClass(classe.id));
      this.dialog.open(ShowAllStudentsDialogComponent, {
        width: '600px',
        data: { students }
      });
    } catch (err) {
      this.snackbarService.showError('Failed to load students.');
    }
  }
 
  private async refreshCurrentView(): Promise<void> {
    if (this.selectedLevelId) {
      await this.onLevelFilter(this.selectedLevelId);
    } else if (this.selectedDepartmentId) {
      await this.loadClassesByDepartment(this.selectedDepartmentId);
    } else {
      await this.loadData();
    }
  }
 
  private resetCreateForm(): void {
    this.createForm = {
      nom: '',
      description: '',
      niveauId: '',
      capacite: 30
    };
   
    // Reset hierarchical form fields
    this.createFormDepartmentId = this.selectedDepartmentId ?? '';
    this.createFormLevelId = '';
    this.createFormLevels = [];
   
    // If we have a pre-selected department, load its levels
    if (this.createFormDepartmentId) {
      this.onDepartmentSelectedForCreate(this.createFormDepartmentId);
    }
  }
 
  getDepartmentName(departmentId: string): string {
    const department = this.departments.find(d => d.id === departmentId);
    return department?.nom ?? 'Unknown Department';
  }
 
  getLevelName(levelId: string): string {
    const level = this.levels.find(l => l.id === levelId);
    return level?.nom ?? 'Unknown Level';
  }
 
  getAvailableLevels(): Niveau[] {
    if (this.selectedDepartmentId) {
      return this.levels;
    }
    return [];
  }
}