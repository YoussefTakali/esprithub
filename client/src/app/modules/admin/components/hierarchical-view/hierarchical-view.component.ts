import { Component, OnInit } from '@angular/core';
import { AcademicService } from '../../../../shared/services/academic.service';
import { UserService } from '../../../../shared/services/user.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { 
  Departement, 
  Niveau, 
  Classe, 
  User, 
  UserRole 
} from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-hierarchical-view',
  templateUrl: './hierarchical-view.component.html',
  styleUrls: ['./hierarchical-view.component.css']
})
export class HierarchicalViewComponent implements OnInit {
  // Données hiérarchiques
  departments: Departement[] = [];
  selectedDepartment: Departement | null = null;
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

  constructor(
    private readonly academicService: AcademicService,
    private readonly userService: UserService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  async loadDepartments(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const departments = await this.academicService.getAllDepartements().toPromise();
      this.departments = departments ?? [];
      
      if (this.departments.length > 0) {
        this.selectDepartment(this.departments[0]);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      this.error = 'Failed to load departments.';
      this.snackbarService.showError('Failed to load departments.');
    } finally {
      this.loading = false;
    }
  }

  async selectDepartment(department: Departement): Promise<void> {
    this.selectedDepartment = department;
    this.selectedLevel = null;
    this.selectedClass = null;
    this.levels = [];
    this.classes = [];
    this.students = [];
    
    await this.loadLevels(department.id);
  }

  async loadLevels(departmentId: string): Promise<void> {
    try {
      this.loadingLevels = true;
      this.levelsError = null;
      
      const levels = await this.academicService.getNiveauxByDepartement(departmentId).toPromise();
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
      
      const classes = await this.academicService.getClassesByNiveau(levelId).toPromise();
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
  getDepartmentStats(department: Departement): string {
    return `${department.totalNiveaux} levels`;
  }

  getLevelStats(level: Niveau): string {
    return `${level.totalClasses || 0} classes`;
  }

  getClassStats(classe: Classe): string {
    return `${classe.totalEtudiants || 0} students`;
  }

  isActiveDepartment(department: Departement): boolean {
    return this.selectedDepartment?.id === department.id;
  }

  isActiveLevel(level: Niveau): boolean {
    return this.selectedLevel?.id === level.id;
  }

  isActiveClass(classe: Classe): boolean {
    return this.selectedClass?.id === classe.id;
  }

  refreshData(): void {
    if (this.selectedDepartment) {
      this.loadLevels(this.selectedDepartment.id);
    }
  }
} 