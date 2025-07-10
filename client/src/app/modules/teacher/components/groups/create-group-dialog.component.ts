import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-group-dialog',
  templateUrl: './create-group-dialog.component.html',
  styleUrls: ['./create-group-dialog.component.css']
})
export class CreateGroupDialogComponent {
  form: FormGroup;
  students: any[];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateGroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { students: any[] }
  ) {
    this.students = data.students;
    this.form = this.fb.group({
      groupName: ['', Validators.required],
      members: [[], Validators.required],
      isPrivate: [true] // Default to private repository
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onCreate() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
