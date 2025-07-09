import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademicService } from '../../../../shared/services/academic.service';
import { UserService } from '../../../../shared/services/user.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
import { 
  Departement, 
  CreateDepartement, 
  Specialites, 
  TypeFormation,
  User, 
  UserRole 
} from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-department-management',
  templateUrl: './department-management.component.html',
  styleUrls: ['./department-management.component.css']
})
export class DepartmentManagementComponent implements OnInit {
  departments: Departement[] = [];
  filteredDepartments: Departement[] = [];
  searchTerm: string = '';
  selectedDepartmentId: string | null = null;
  availableChiefs: User[] = [];
  specialities = Object.values(Specialites);
  typeFormations = Object.values(TypeFormation);
  
  loading = true;
  saving = false;
  error: string | null = null;
  
  showCreateForm = false;
  editingDepartment: Departement | null = null;
  
  createForm: CreateDepartement = {
    nom: '',
    specialite: Specialites.INFORMATIQUE,
    typeFormation: TypeFormation.INGENIEUR,
    description: ''
  };

  constructor(
    private readonly academicService: AcademicService,
    private readonly userService: UserService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      const [departments, users] = await Promise.all([
        firstValueFrom(this.academicService.getAllDepartements()),
        firstValueFrom(this.userService.getAllUsers())
      ]);
      
      this.departments = departments ?? [];
      this.filteredDepartments = this.departments;
      this.availableChiefs = users?.filter(user => 
        user.role === UserRole.CHIEF && !user.departementId
      ) ?? [];
    } catch (error) {
      console.error('Error loading departments:', error);
      this.snackbarService.showError('Failed to load departments. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  filterDepartments(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredDepartments = this.departments;
      return;
    }
    this.filteredDepartments = this.departments.filter(dep =>
      dep.nom.toLowerCase().includes(term) ||
      (dep.code && dep.code.toLowerCase().includes(term))
    );
  }

  onCreateDepartment(): void {
    this.showCreateForm = true;
    this.editingDepartment = null;
    this.resetCreateForm();
  }

  onEditDepartment(department: Departement): void {
    this.editingDepartment = department;
    this.showCreateForm = true;
    this.createForm = {
      nom: department.nom,
      specialite: department.specialite,
      typeFormation: department.typeFormation,
      description: department.description ?? ''
    };
  }

  onCancelForm(): void {
    this.showCreateForm = false;
    this.editingDepartment = null;
    this.resetCreateForm();
  }

  async onSubmitForm(): Promise<void> {
    if (!this.createForm.nom.trim()) {
      this.snackbarService.showError('Department name is required.');
      return;
    }

    try {
      this.saving = true;
      this.error = null;

      if (this.editingDepartment) {
        // Update existing department
        await firstValueFrom(
          this.academicService.updateDepartement(this.editingDepartment.id, this.createForm)
        );
      } else {
        // Create new department
        await firstValueFrom(
          this.academicService.createDepartement(this.createForm)
        );
      }

      await this.loadData();
      this.onCancelForm();
    } catch (error) {
      console.error('Error saving department:', error);
      this.snackbarService.showError(`Failed to ${this.editingDepartment ? 'update' : 'create'} department. Please try again.`);
    } finally {
      this.saving = false;
    }
  }

  async onDeleteDepartment(department: Departement): Promise<void> {
    if (!confirm(`Are you sure you want to delete the department "${department.nom}"?`)) {
      return;
    }

    try {
      this.saving = true;
      this.error = null;
      
      await firstValueFrom(
        this.academicService.deleteDepartement(department.id)
      );
      
      await this.loadData();
    } catch (error) {
      console.error('Error deleting department:', error);
      this.snackbarService.showError('Failed to delete department. Please try again.');
    } finally {
      this.saving = false;
    }
  }

  async onToggleActiveStatus(department: Departement): Promise<void> {
    try {
      this.saving = true;
      this.error = null;
      
      if (department.isActive) {
        await firstValueFrom(
          this.academicService.deactivateDepartement(department.id)
        );
      } else {
        await firstValueFrom(
          this.academicService.activateDepartement(department.id)
        );
      }
      
      await this.loadData();
    } catch (error) {
      console.error('Error toggling department status:', error);
      this.snackbarService.showError('Failed to update department status. Please try again.');
    } finally {
      this.saving = false;
    }
  }

  async onAssignChief(department: Departement, chiefId: string): Promise<void> {
    try {
      this.saving = true;
      this.error = null;
      
      await firstValueFrom(
        this.academicService.assignChiefToDepartement(department.id, chiefId)
      );
      this.snackbarService.showSuccess('Chief assigned successfully!');
      
      await this.loadData();
    } catch (error) {
      console.error('Error assigning chief:', error);
      this.snackbarService.showError('Failed to assign chief. Please try again.');
      this.error = 'Failed to assign chief. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  async onRemoveChief(department: Departement): Promise<void> {
    if (!confirm(`Remove chief from department "${department.nom}"?`)) {
      return;
    }

    try {
      this.saving = true;
      this.error = null;
      
      await firstValueFrom(
        this.academicService.removeChiefFromDepartement(department.id)
      );
      this.snackbarService.showSuccess('Chief removed successfully!');
      
      await this.loadData();
    } catch (error) {
      console.error('Error removing chief:', error);
      this.snackbarService.showError('Failed to remove chief. Please try again.');
      this.error = 'Failed to remove chief. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  private resetCreateForm(): void {
    this.createForm = {
      nom: '',
      specialite: Specialites.INFORMATIQUE,
      typeFormation: TypeFormation.INGENIEUR,
      description: ''
    };
  }

  getSpecialityDisplayName(speciality: Specialites): string {
    const specialityNames: Record<Specialites, string> = {
      [Specialites.INFORMATIQUE]: 'Computer Science',
      [Specialites.TELECOMMUNICATIONS]: 'Telecommunications',
      [Specialites.ELECTROMECANIQUE]: 'Electromechanical Engineering',
      [Specialites.GENIE_CIVIL]: 'Civil Engineering',
      [Specialites.GENIE_INDUSTRIEL]: 'Industrial Engineering'
    };
    return specialityNames[speciality] ?? speciality;
  }

  getTypeFormationDisplayName(typeFormation: TypeFormation): string {
    const typeFormationNames: Record<TypeFormation, string> = {
      [TypeFormation.INGENIEUR]: 'Engineering',
      [TypeFormation.LICENCE]: 'Bachelor\'s Degree',
      [TypeFormation.MASTERE]: 'Master\'s Degree',
      [TypeFormation.CYCLE_PREPARATOIRE]: 'Preparatory Cycle'
    };
    return typeFormationNames[typeFormation] ?? typeFormation;
  }
}
