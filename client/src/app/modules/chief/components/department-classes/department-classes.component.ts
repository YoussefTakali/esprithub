import { Component, OnInit } from '@angular/core';
import { AcademicService } from '../../../../shared/services/academic.service';
import { Classe } from '../../../../shared/models/academic.models';
import { firstValueFrom } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Niveau, CreateClasse } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-department-classes',
  templateUrl: './department-classes.component.html',
  styleUrls: ['./department-classes.component.css']
})
export class DepartmentClassesComponent implements OnInit {
  classes: Classe[] = [];
  levels: Niveau[] = [];
  loading = true;
  saving = false;
  error: string | null = null;
  showForm = false;
  editingClass?: Classe;
  classForm!: FormGroup;

  constructor(
    private readonly academicService: AcademicService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadClasses();
    this.loadLevels();
    this.initForm();
  }

  private initForm() {
    this.classForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      niveauId: ['', Validators.required],
      capacite: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      description: ['']
    });
  }

  async loadClasses(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      const classes = await firstValueFrom(this.academicService.getMyDepartmentClasses());
      this.classes = classes ?? [];
    } catch (error) {
      console.error('Error loading classes:', error);
      this.error = 'Failed to load classes. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async loadLevels(): Promise<void> {
    try {
      const levels = await firstValueFrom(this.academicService.getMyDepartmentNiveaux());
      this.levels = levels ?? [];
    } catch (error) {
      console.error('Error loading levels:', error);
      this.levels = [];
    }
  }

  openCreateForm() {
    this.editingClass = undefined;
    this.classForm.reset({ capacite: 1 });
    this.showForm = true;
  }

  openEditForm(classe: Classe) {
    this.editingClass = classe;
    this.classForm.patchValue({
      nom: classe.nom,
      niveauId: classe.niveauId,
      capacite: classe.capacite,
      description: classe.description ?? ''
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingClass = undefined;
    this.classForm.reset({ capacite: 1 });
  }

  async onSubmit() {
    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const formData = this.classForm.value;
    const payload: CreateClasse = {
      nom: formData.nom,
      niveauId: formData.niveauId,
      capacite: formData.capacite,
      description: formData.description
    };
    if (this.editingClass) {
      // Update
      this.academicService.updateClasseInMyDepartment(this.editingClass.id, payload).subscribe({
        next: (updated) => {
          const idx = this.classes.findIndex(c => c.id === updated.id);
          if (idx !== -1) this.classes[idx] = updated;
          this.closeForm();
          this.saving = false;
        },
        error: (err) => {
          console.error('Error updating class:', err);
          this.error = 'Failed to update class.';
          this.saving = false;
        }
      });
    } else {
      // Create
      this.academicService.createClasseInMyDepartment(payload).subscribe({
        next: (created) => {
          this.classes.unshift(created);
          this.closeForm();
          this.saving = false;
        },
        error: (err) => {
          console.error('Error creating class:', err);
          this.error = 'Failed to create class.';
          this.saving = false;
        }
      });
    }
  }

  deleteClass(classe: Classe) {
    if (!confirm(`Are you sure you want to delete "${classe.nom}"?`)) return;
    this.saving = true;
    this.academicService.deleteClasseInMyDepartment(classe.id).subscribe({
      next: () => {
        this.classes = this.classes.filter(c => c.id !== classe.id);
        this.saving = false;
      },
      error: (err) => {
        console.error('Error deleting class:', err);
        this.error = 'Failed to delete class.';
        this.saving = false;
      }
    });
  }
}
