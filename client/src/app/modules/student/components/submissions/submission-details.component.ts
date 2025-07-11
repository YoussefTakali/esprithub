import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubmissionService, SubmissionDetails } from '../../../../shared/services/submission.service';

@Component({
  selector: 'app-submission-details',
  templateUrl: './submission-details.component.html',
  styleUrls: ['./submission-details.component.css']
})
export class SubmissionDetailsComponent implements OnInit {
  submissionId!: string;
  submission: SubmissionDetails | null = null;
  loading = true;
  error: string | null = null;
  
  selectedFile: any = null;
  fileContent: any = null;
  loadingFileContent = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly submissionService: SubmissionService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.submissionId = params['id'];
      this.loadSubmissionDetails();
    });
  }

  loadSubmissionDetails(): void {
    this.loading = true;
    this.error = null;

    this.submissionService.getSubmissionDetails(this.submissionId).subscribe({
      next: (submission) => {
        this.submission = submission;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading submission details:', error);
        this.error = 'Failed to load submission details. Please try again.';
        this.loading = false;
      }
    });
  }

  selectFile(file: any): void {
    this.selectedFile = file;
    this.loadFileContent(file.id);
  }

  loadFileContent(fileId: string): void {
    this.loadingFileContent = true;
    this.fileContent = null;

    this.submissionService.getFileContent(fileId).subscribe({
      next: (content) => {
        this.fileContent = content;
        this.loadingFileContent = false;
      },
      error: (error) => {
        console.error('Error loading file content:', error);
        this.snackBar.open('Failed to load file content', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loadingFileContent = false;
      }
    });
  }

  downloadFile(file: any): void {
    if (this.fileContent?.content) {
      const blob = new Blob([this.fileContent.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || file.fileName || 'file.txt';
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      this.snackBar.open('No file content to download', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCommitHash(hash: string): string {
    return hash ? hash.substring(0, 8) : '';
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'graded': return '#28a745';
      case 'submitted': return '#17a2b8';
      case 'draft': return '#ffc107';
      case 'returned': return '#fd7e14';
      default: return '#6c757d';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'graded': return 'grade';
      case 'submitted': return 'check_circle';
      case 'draft': return 'edit';
      case 'returned': return 'assignment_return';
      default: return 'help';
    }
  }

  getGradeDisplay(): string {
    if (!this.submission || !this.submission.isGraded || this.submission.grade === null || this.submission.maxGrade === null) {
      return 'Not graded';
    }
    return `${this.submission.grade}/${this.submission.maxGrade} (${Math.round(this.submission.gradePercentage || 0)}%)`;
  }

  getGradeClass(): string {
    if (!this.submission || !this.submission.isGraded || !this.submission.gradePercentage) return '';
    
    if (this.submission.gradePercentage >= 80) return 'grade-excellent';
    if (this.submission.gradePercentage >= 70) return 'grade-good';
    if (this.submission.gradePercentage >= 60) return 'grade-average';
    return 'grade-poor';
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return 'code';
      case 'html':
      case 'htm':
        return 'web';
      case 'css':
      case 'scss':
      case 'sass':
        return 'style';
      case 'json':
        return 'data_object';
      case 'md':
        return 'description';
      case 'txt':
        return 'text_snippet';
      case 'java':
        return 'coffee';
      case 'py':
        return 'python';
      default:
        return 'insert_drive_file';
    }
  }

  goBack(): void {
    this.router.navigate(['/student/submissions']);
  }

  openCommitUrl(): void {
    if (this.submission?.commitDetails?.url) {
      window.open(this.submission.commitDetails.url, '_blank');
    }
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'graded': return 'status-graded';
      case 'submitted': return 'status-submitted';
      case 'reviewed': return 'status-reviewed';
      default: return 'status-submitted';
    }
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  closeFileViewer(): void {
    this.selectedFile = null;
    this.fileContent = null;
  }

  viewFile(file: any): void {
    // Simple implementation - could be enhanced to show file content
    console.log('Viewing file:', file);
    this.selectedFile = file;
    // You could implement file viewing logic here
  }
}
