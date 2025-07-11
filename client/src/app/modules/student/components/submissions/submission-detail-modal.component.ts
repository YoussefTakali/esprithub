import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SubmissionService, SubmissionDetails, SubmissionFile } from '../../../../shared/services/submission.service';

@Component({
  selector: 'app-submission-detail-modal',
  templateUrl: './submission-detail-modal.component.html',
  styleUrls: ['./submission-detail-modal.component.css']
})
export class SubmissionDetailModalComponent implements OnInit {
  submissionDetails: SubmissionDetails | null = null;
  loading = true;
  error: string | null = null;
  selectedFileIndex = 0;

  constructor(
    public dialogRef: MatDialogRef<SubmissionDetailModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { submissionId: string, taskTitle: string },
    private readonly submissionService: SubmissionService
  ) {}

  ngOnInit(): void {
    this.loadSubmissionDetails();
  }

  loadSubmissionDetails(): void {
    this.loading = true;
    this.error = null;

    this.submissionService.getSubmissionDetails(this.data.submissionId).subscribe({
      next: (details) => {
        console.log('Submission details received:', details);
        console.log('Files:', details.files);
        this.submissionDetails = details;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading submission details:', error);
        this.error = 'Failed to load submission details. Please try again.';
        this.loading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  openGitHub(): void {
    if (this.submissionDetails?.commitDetails?.url) {
      window.open(this.submissionDetails.commitDetails.url, '_blank');
    }
  }

  selectFile(index: number): void {
    this.selectedFileIndex = index;
  }

  getSelectedFile(): SubmissionFile | null {
    if (!this.submissionDetails?.files || this.submissionDetails.files.length === 0) {
      return null;
    }
    return this.submissionDetails.files[this.selectedFileIndex] || null;
  }

  // File handling methods
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'fab fa-js-square';
      case 'ts':
      case 'tsx':
        return 'fas fa-code';
      case 'html':
      case 'htm':
        return 'fab fa-html5';
      case 'css':
      case 'scss':
      case 'sass':
        return 'fab fa-css3-alt';
      case 'json':
        return 'fas fa-file-code';
      case 'md':
        return 'fab fa-markdown';
      case 'py':
        return 'fab fa-python';
      case 'java':
        return 'fab fa-java';
      case 'xml':
        return 'fas fa-code';
      case 'txt':
        return 'fas fa-file-alt';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return 'fas fa-file-image';
      default:
        return 'fas fa-file';
    }
  }

  getFileLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
      case 'sass':
        return 'scss';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'xml':
        return 'xml';
      case 'txt':
        return 'text';
      default:
        return 'text';
    }
  }

  isImageFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(extension || '');
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';
    return Math.round(size / (1024 * 1024)) + ' MB';
  }

  // Decode base64 content
  atob(content: string): string {
    try {
      return atob(content);
    } catch (error) {
      console.error('Error decoding base64 content:', error);
      return 'Error decoding file content';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  getGradeDisplay(): string {
    if (!this.submissionDetails?.isGraded || 
        this.submissionDetails.grade === null || 
        this.submissionDetails.maxGrade === null) {
      return 'Not graded';
    }
    return `${this.submissionDetails.grade}/${this.submissionDetails.maxGrade} (${Math.round(this.submissionDetails.gradePercentage || 0)}%)`;
  }
}
