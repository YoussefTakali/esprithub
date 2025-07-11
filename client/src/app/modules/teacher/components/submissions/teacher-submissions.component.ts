import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubmissionService } from '../../../../shared/services/submission.service';
import { TeacherSubmissionDetailModalComponent } from './teacher-submission-detail-modal.component';

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
  selector: 'app-teacher-submissions',
  templateUrl: './teacher-submissions.component.html',
  styleUrls: ['./teacher-submissions.component.css']
})
export class TeacherSubmissionsComponent implements OnInit {
  submissions: SubmissionDetails[] = [];
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;
  
  // Filters
  statusFilter = 'all';
  projectFilter = 'all';
  gradeFilter = 'all';
  
  // Stats
  stats = {
    total: 0,
    pending: 0,
    graded: 0,
    averageGrade: 0
  };

  constructor(
    private readonly submissionService: SubmissionService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.loading = true;
    this.error = null;

    this.submissionService.getTeacherSubmissions(this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        this.submissions = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;
        this.calculateStats();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading submissions:', error);
        this.error = 'Failed to load submissions';
        this.loading = false;
        this.snackBar.open('Failed to load submissions', 'Close', { duration: 3000 });
      }
    });
  }

  calculateStats(): void {
    this.stats.total = this.submissions.length;
    this.stats.pending = this.submissions.filter(s => !s.isGraded).length;
    this.stats.graded = this.submissions.filter(s => s.isGraded).length;
    
    const gradedSubmissions = this.submissions.filter(s => s.isGraded && s.grade !== undefined);
    if (gradedSubmissions.length > 0) {
      const totalGrade = gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);
      this.stats.averageGrade = totalGrade / gradedSubmissions.length;
    } else {
      this.stats.averageGrade = 0;
    }
  }

  refresh(): void {
    this.currentPage = 0;
    this.loadSubmissions();
  }

  viewSubmissionDetails(submission: SubmissionDetails): void {
    const dialogRef = this.dialog.open(TeacherSubmissionDetailModalComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      data: { submissionId: submission.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'graded') {
        this.loadSubmissions(); // Refresh to show updated grades
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'submitted': return '#ffc107';
      case 'graded': return '#28a745';
      case 'reviewed': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  getGradeDisplay(submission: SubmissionDetails): string {
    if (!submission.isGraded || submission.grade === undefined) {
      return 'Not graded';
    }
    const maxGrade = submission.maxGrade || 20;
    return `${submission.grade}/${maxGrade}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadSubmissions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadSubmissions();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadSubmissions();
  }
}
