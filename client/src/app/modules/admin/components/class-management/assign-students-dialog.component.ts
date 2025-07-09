import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-assign-students-dialog',
  templateUrl: './assign-students-dialog.component.html',
  styleUrls: ['./assign-students-dialog.component.css']
})
export class AssignStudentsDialogComponent {
  selectedStudentIds: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<AssignStudentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { students: any[] }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onAssign(): void {
    this.dialogRef.close(this.selectedStudentIds);
  }
}
