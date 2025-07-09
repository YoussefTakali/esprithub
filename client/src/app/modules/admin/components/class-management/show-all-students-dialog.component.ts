import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../../../../shared/services/user.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';
 
@Component({
  selector: 'app-show-all-students-dialog',
  template: `
    <h2 mat-dialog-title>All Students</h2>
    <mat-dialog-content>
      <div *ngIf="!data.students || data.students.length === 0">
        <p>No students found.</p>
      </div>
      <table *ngIf="data.students && data.students.length > 0" class="students-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Class</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let student of data.students">
            <td>{{ student.fullName }}</td>
            <td>{{ student.email }}</td>
            <td>{{ student.classeNom || '-' }}</td>
            <td>
              <button mat-button color="warn" (click)="removeStudent(student)" [disabled]="removingId === student.id">
                <span *ngIf="removingId !== student.id">Remove</span>
                <span *ngIf="removingId === student.id">...</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .students-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    .students-table th, .students-table td {
      border: 1px solid #e0e0e0;
      padding: 8px 12px;
      text-align: left;
    }
    .students-table th {
      background: #f5f5f5;
      font-weight: 600;
    }
  `]
})
export class ShowAllStudentsDialogComponent {
  removingId: string | null = null;
  constructor(
    public dialogRef: MatDialogRef<ShowAllStudentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { students: any[] },
    private userService: UserService,
    private snackbar: SnackbarService
  ) {}
 
  removeStudent(student: any) {
    if (!confirm(`Remove ${student.fullName} from this class?`)) return;
    this.removingId = student.id;
    this.userService.removeUserFromClass(student.id).subscribe({
      next: () => {
        this.data.students = this.data.students.filter((s: any) => s.id !== student.id);
        this.snackbar.showSuccess('Student removed from class!');
        this.removingId = null;
      },
      error: () => {
        this.snackbar.showError('Failed to remove student.');
        this.removingId = null;
      }
    });
  }
}