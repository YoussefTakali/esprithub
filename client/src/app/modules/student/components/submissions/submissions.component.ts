import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubmissionService, Submission } from '../../../../shared/services/submission.service';
import { SubmissionDetailModalComponent } from './submission-detail-modal.component';

@Component({
  selector: 'app-student-submissions',
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.css']
})
export class StudentSubmissionsComponent implements OnInit {
  submissions: Submission[] = [];
  loading = true;
  error: string | null = null;
  
  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 10;

  constructor(
    private readonly submissionService: SubmissionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(page: number = 0): void {
    this.loading = true;
    this.error = null;
    
    this.submissionService.getMySubmissions(page, this.pageSize).subscribe({
      next: (response) => {
        this.submissions = response.content;
        this.currentPage = page;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading submissions:', error);
        this.error = 'Failed to load submissions. Please try again.';
        this.loading = false;
      }
    });
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

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'graded': return 'grade';
      case 'submitted': return 'check_circle';
      case 'draft': return 'edit';
      case 'returned': return 'assignment_return';
      default: return 'help';
    }
  }

  getGradeDisplay(submission: Submission): string {
    if (!submission.isGraded || submission.grade === null || submission.maxGrade === null) {
      return 'Not graded';
    }
    return `${submission.grade}/${submission.maxGrade} (${Math.round(submission.gradePercentage || 0)}%)`;
  }

  getGradeClass(submission: Submission): string {
    if (!submission.isGraded || !submission.gradePercentage) return '';
    
    if (submission.gradePercentage >= 80) return 'grade-excellent';
    if (submission.gradePercentage >= 70) return 'grade-good';
    if (submission.gradePercentage >= 60) return 'grade-average';
    return 'grade-poor';
  }

  refresh(): void {
    this.loadSubmissions(0);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadSubmissions(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadSubmissions(this.currentPage - 1);
    }
  }

  goToTaskSubmission(): void {
    this.router.navigate(['/student/tasks']);
  }

  // Stats calculation methods
  getGradedCount(): number {
    return this.submissions.filter(s => s.isGraded).length;
  }

  getPendingReviewCount(): number {
    return this.submissions.filter(s => s.status === 'SUBMITTED').length;
  }

  getLateSubmissionsCount(): number {
    return this.submissions.filter(s => s.isLate).length;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'graded': return 'status-graded';
      case 'submitted': return 'status-submitted';
      case 'reviewed': return 'status-reviewed';
      default: return 'status-submitted';
    }
  }

  // Submission modal methods
  openSubmissionModal(submission: Submission): void {
    const dialogRef = this.dialog.open(SubmissionDetailModalComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      data: {
        submissionId: submission.id,
        taskTitle: submission.taskTitle
      },
      panelClass: 'submission-modal'
    });

    dialogRef.afterClosed().subscribe(result => {
      // Handle any actions after modal is closed if needed
    });
  }
}
