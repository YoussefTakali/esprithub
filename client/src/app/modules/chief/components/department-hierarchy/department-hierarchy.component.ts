import { Component, OnInit } from '@angular/core';
import { AcademicService } from '../../../../shared/services/academic.service';
import { UserService } from '../../../../shared/services/user.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { AuthService } from '../../../../services/auth.service';
import { 
  Departement, 
  Niveau, 
  Classe, 
  User, 
  UserRole 
} from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-department-hierarchy',
  templateUrl: './department-hierarchy.component.html',
  styleUrls: ['./department-hierarchy.component.css']
})
export class DepartmentHierarchyComponent implements OnInit {
  // Données hiérarchiques
  department: Departement | null = null;
  selectedLevel: Niveau | null = null;
  selectedClass: Classe | null = null;
  
  // Données des niveaux et classes
  levels: Niveau[] = [];
  classes: Classe[] = [];
  students: User[] = [];
  
  // États de chargement
  loading = true;
  loadingLevels = false;
  loadingClasses = false;
  loadingStudents = false;
  
  // États d'erreur
  error: string | null = null;
  levelsError: string | null = null;
  classesError: string | null = null;
  studentsError: string | null = null;

  editMode = false;
  departmentEdit: Partial<Departement> = {};

  constructor(
    private readonly academicService: AcademicService,
    private readonly userService: UserService,
    private readonly snackbarService: SnackbarService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDepartment();
  }

  async loadDepartment(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      // Appel direct à l’API chief pour récupérer le département du chef connecté
      const department = await this.academicService.getMyDepartment().toPromise();
      this.department = department || null;
      if (this.department) {
        await this.loadLevels(this.department.id);
      } else {
        this.error = 'No department assigned to this chief.';
      }
    } catch (error) {
      console.error('Error loading department:', error);
      this.error = 'Failed to load department.';
      this.snackbarService.showError('Failed to load department.');
    } finally {
      this.loading = false;
    }
  }

  async loadLevels(departmentId: string): Promise<void> {
    try {
      this.loadingLevels = true;
      this.levelsError = null;
      // Utiliser l'endpoint chief pour charger les niveaux du département du chef
      const levels = await this.academicService.getMyDepartmentNiveaux().toPromise();
      this.levels = levels ?? [];
      if (this.levels.length > 0) {
        this.selectLevel(this.levels[0]);
      }
    } catch (error) {
      console.error('Error loading levels:', error);
      this.levelsError = 'Failed to load levels.';
      this.snackbarService.showError('Failed to load levels.');
    } finally {
      this.loadingLevels = false;
    }
  }

  async selectLevel(level: Niveau): Promise<void> {
    this.selectedLevel = level;
    this.selectedClass = null;
    this.classes = [];
    this.students = [];
    
    await this.loadClasses(level.id);
  }

  async loadClasses(levelId: string): Promise<void> {
    try {
      this.loadingClasses = true;
      this.classesError = null;
      // Utiliser l'endpoint chief pour charger les classes du niveau dans le département du chef
      const classes = await this.academicService.getClassesByNiveauInMyDepartment(levelId).toPromise();
      this.classes = classes ?? [];
      if (this.classes.length > 0) {
        this.selectClass(this.classes[0]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      this.classesError = 'Failed to load classes.';
      this.snackbarService.showError('Failed to load classes.');
    } finally {
      this.loadingClasses = false;
    }
  }

  async selectClass(classe: Classe): Promise<void> {
    this.selectedClass = classe;
    this.students = [];
    
    await this.loadStudents(classe.id);
  }

  async loadStudents(classId: string): Promise<void> {
    try {
      this.loadingStudents = true;
      this.studentsError = null;
      
      const students = await this.userService.getUsersByClass(classId).toPromise();
      this.students = students ?? [];
    } catch (error) {
      console.error('Error loading students:', error);
      this.studentsError = 'Failed to load students.';
      this.snackbarService.showError('Failed to load students.');
    } finally {
      this.loadingStudents = false;
    }
  }

  // Méthodes utilitaires
  getLevelStats(level: Niveau): string {
    return `${level.totalClasses || 0} classes`;
  }

  getClassStats(classe: Classe): string {
    return `${classe.totalEtudiants || 0} students`;
  }

  isActiveLevel(level: Niveau): boolean {
    return this.selectedLevel?.id === level.id;
  }

  isActiveClass(classe: Classe): boolean {
    return this.selectedClass?.id === classe.id;
  }

  refreshData(): void {
    if (this.department) {
      this.loadLevels(this.department.id);
    }
  }

  onEditDepartment() {
    if (this.department) {
      this.editMode = true;
      this.departmentEdit = {
        nom: this.department.nom,
        description: this.department.description
      };
    }
  }

  onCancelEditDepartment() {
    this.editMode = false;
    this.departmentEdit = {};
  }

  onSaveDepartmentEdit() {
    if (!this.departmentEdit.nom || this.departmentEdit.nom.trim() === '') {
      this.snackbarService.showError('Department name is required.');
      return;
    }
    this.academicService.updateMyDepartment({
      ...this.department,
      nom: this.departmentEdit.nom,
      description: this.departmentEdit.description
    }).subscribe({
      next: (updated) => {
        this.department = updated;
        this.editMode = false;
        this.snackbarService.showSuccess('Department updated successfully!');
      },
      error: () => {
        this.snackbarService.showError('Failed to update department.');
      }
    });
  }
} 