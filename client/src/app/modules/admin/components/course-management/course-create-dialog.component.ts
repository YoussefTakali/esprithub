import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Departement, Niveau } from '../../../../shared/models/academic.models';

@Component({
  selector: 'app-course-create-dialog',
  templateUrl: './course-create-dialog.component.html',
  styleUrls: ['./course-create-dialog.component.css']
})
export class CourseCreateDialogComponent {
  name = '';
  description = '';
  selectedDepartmentId = '';
  selectedNiveauId = '';
  niveaux: Niveau[] = [];

  constructor(
    public dialogRef: MatDialogRef<CourseCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { departments: Departement[], niveauxByDepartment: (id: string) => Promise<Niveau[]> }
  ) {}

  async onDepartmentChange() {
    this.niveaux = await this.data.niveauxByDepartment(this.selectedDepartmentId);
    this.selectedNiveauId = this.niveaux[0]?.id || '';
  }

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    if (!this.name.trim() || !this.selectedNiveauId) return;
    this.dialogRef.close({
      name: this.name,
      description: this.description,
      niveauId: this.selectedNiveauId
    });
  }
}
