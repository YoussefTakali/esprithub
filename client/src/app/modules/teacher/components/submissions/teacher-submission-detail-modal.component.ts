import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubmissionService, GradeSubmissionData } from '../../../../shared/services/submission.service';

interface SubmissionDetails {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  studentName: string;
  studentEmail: string;
  groupName?: string;
  submittedAt: string;
  status: string;
  commitHash: string;
  githubUrl: string;
  isGraded: boolean;
  grade?: number;
  maxGrade?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  files: SubmissionFile[];
  isLate: boolean;
  dueDate: string;
  attemptNumber: number;
}

interface SubmissionFile {
  id: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  contentType: string;
  content: string;
  extension: string;
  displaySize: string;
}

@Component({
  selector: 'app-teacher-submission-detail-modal',
  templateUrl: './teacher-submission-detail-modal.component.html',
  styleUrls: ['./teacher-submission-detail-modal.component.css']
})
export class TeacherSubmissionDetailModalComponent implements OnInit {
  submissionDetails: SubmissionDetails | null = null;
  selectedFile: SubmissionFile | null = null;
  loading = false;
  error: string | null = null;
  
  // Grading
  showGradeForm = false;
  gradeForm = {
    grade: 0,
    maxGrade: 20,
    feedback: ''
  };
  gradingSubmission = false;

  constructor(
    public dialogRef: MatDialogRef<TeacherSubmissionDetailModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { submissionId: string },
    private readonly submissionService: SubmissionService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSubmissionDetails();
  }

  loadSubmissionDetails(): void {
    this.loading = true;
    this.error = null;

    this.submissionService.getSubmissionDetails(this.data.submissionId).subscribe({
      next: (details: any) => {
        this.submissionDetails = details;
        
        // Pre-fill grade form if already graded
        if (details.isGraded) {
          this.gradeForm.grade = details.grade || 0;
          this.gradeForm.maxGrade = details.maxGrade || 20;
          this.gradeForm.feedback = details.feedback || '';
        }
        
        this.loading = false;
        console.log('Loaded submission details:', details);
      },
      error: (error: any) => {
        console.error('Error loading submission details:', error);
        this.error = 'Failed to load submission details';
        this.loading = false;
      }
    });
  }

  selectFile(file: SubmissionFile): void {
    this.selectedFile = file;
  }

  getFileContent(): string {
    if (!this.selectedFile?.content) {
      return '';
    }
    
    try {
      // Try to decode base64 content
      return atob(this.selectedFile.content);
    } catch (error) {
      // If decoding fails, return content as-is
      console.debug('Content is not base64 encoded, returning as-is:', error);
      return this.selectedFile.content;
    }
  }

  isImageFile(file: SubmissionFile): boolean {
    return file.contentType?.startsWith('image/') || false;
  }

  getImageSrc(file: SubmissionFile): string {
    return `data:${file.contentType};base64,${file.content}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'submitted': return '#ffc107';
      case 'graded': return '#28a745';
      case 'reviewed': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  // Grading functionality
  toggleGradeForm(): void {
    this.showGradeForm = !this.showGradeForm;
  }

  submitGrade(): void {
    if (this.gradeForm.grade < 0 || this.gradeForm.grade > this.gradeForm.maxGrade) {
      this.snackBar.open('Grade must be between 0 and ' + this.gradeForm.maxGrade, 'Close', { duration: 3000 });
      return;
    }

    this.gradingSubmission = true;

    const gradeData: GradeSubmissionData = {
      grade: this.gradeForm.grade,
      maxGrade: this.gradeForm.maxGrade,
      feedback: this.gradeForm.feedback
    };

    this.submissionService.gradeSubmission(this.data.submissionId, gradeData).subscribe({
      next: (response: any) => {
        this.snackBar.open('Submission graded successfully', 'Close', { duration: 3000 });
        this.showGradeForm = false;
        this.gradingSubmission = false;
        this.loadSubmissionDetails(); // Reload to show updated grade
        this.dialogRef.close('graded'); // Signal that grading was completed
      },
      error: (error: any) => {
        console.error('Error grading submission:', error);
        this.snackBar.open('Failed to grade submission', 'Close', { duration: 3000 });
        this.gradingSubmission = false;
      }
    });
  }

  cancelGrading(): void {
    this.showGradeForm = false;
    // Reset form if not already graded
    if (!this.submissionDetails?.isGraded) {
      this.gradeForm = {
        grade: 0,
        maxGrade: 20,
        feedback: ''
      };
    } else {
      // Restore original values
      this.gradeForm.grade = this.submissionDetails.grade || 0;
      this.gradeForm.maxGrade = this.submissionDetails.maxGrade || 20;
      this.gradeForm.feedback = this.submissionDetails.feedback || '';
    }
  }

  getGradeDisplay(): string {
    if (!this.submissionDetails?.isGraded || this.submissionDetails.grade === undefined) {
      return 'Not graded';
    }
    const maxGrade = this.submissionDetails.maxGrade || 20;
    return `${this.submissionDetails.grade}/${maxGrade}`;
  }

  close(): void {
    this.dialogRef.close();
  }
}
