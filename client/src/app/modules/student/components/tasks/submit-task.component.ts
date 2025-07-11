import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubmissionService, RepositoryCommit, CreateSubmissionRequest } from '../../../../shared/services/submission.service';

@Component({
  selector: 'app-submit-task',
  templateUrl: './submit-task.component.html',
  styleUrls: ['./submit-task.component.css']
})
export class SubmitTaskComponent implements OnInit {
  taskId!: string;
  repositoryId!: string;
  groupId: string | null = null;
  
  commits: RepositoryCommit[] = [];
  selectedCommit: RepositoryCommit | null = null;
  submissionNotes = '';
  
  loading = true;
  submitting = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalCommits = 0;
  pageSize = 10;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly submissionService: SubmissionService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.taskId = params['taskId'];
    });

    this.route.queryParams.subscribe(params => {
      this.repositoryId = params['repositoryId'];
      this.groupId = params['groupId'] || null;
      
      if (this.repositoryId) {
        this.loadCommits();
      } else {
        this.error = 'No repository ID provided';
      }
    });
  }

  loadCommits(page: number = 0): void {
    this.loading = true;
    this.error = null;

    this.submissionService.getRepositoryCommits(this.repositoryId, page, this.pageSize).subscribe({
      next: (response) => {
        this.commits = response.commits;
        this.currentPage = response.page;
        this.totalCommits = response.totalCommits;
        this.totalPages = Math.ceil(this.totalCommits / this.pageSize);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading commits:', error);
        this.error = 'Failed to load commits. Please try again.';
        this.loading = false;
      }
    });
  }

  selectCommit(commit: RepositoryCommit): void {
    this.selectedCommit = commit;
  }

  submitTask(): void {
    if (!this.selectedCommit) {
      this.snackBar.open('Please select a commit to submit', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.submitting = true;

    const request: CreateSubmissionRequest = {
      taskId: this.taskId,
      commitHash: this.selectedCommit.sha,
      groupId: this.groupId || undefined,
      notes: this.submissionNotes || undefined
    };

    this.submissionService.createSubmission(request).subscribe({
      next: (submission) => {
        this.snackBar.open('Task submitted successfully!', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/student/submissions']);
      },
      error: (error) => {
        console.error('Error submitting task:', error);
        this.snackBar.open('Failed to submit task. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.submitting = false;
      }
    });
  }

  previewCode(): void {
    if (!this.selectedCommit) {
      this.snackBar.open('Please select a commit first', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Navigate to code preview
    this.router.navigate(['/student/preview-submission'], {
      queryParams: {
        repositoryId: this.repositoryId,
        commitHash: this.selectedCommit.sha,
        taskId: this.taskId
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

  getTimeAgo(date: string): string {
    const now = new Date();
    const commitDate = new Date(date);
    const diffMs = now.getTime() - commitDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }

  goBack(): void {
    this.router.navigate(['/student/tasks']);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadCommits(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadCommits(this.currentPage - 1);
    }
  }
}
