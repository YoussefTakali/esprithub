import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubmissionService, Task } from '../../../../shared/services/submission.service';

@Component({
  selector: 'app-task-submission',
  templateUrl: './task-submission.component.html',
  styleUrls: ['./task-submission.component.css']
})
export class TaskSubmissionComponent implements OnInit {
  tasks: Task[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private readonly submissionService: SubmissionService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAvailableTasks();
  }

  loadAvailableTasks(): void {
    this.loading = true;
    this.error = null;

    this.submissionService.getAvailableTasksForSubmission().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.error = 'Failed to load tasks. Please try again.';
        this.loading = false;
      }
    });
  }

  submitTask(task: Task): void {
    if (task.repositoryId) {
      // Navigate to submission wizard with repository
      this.router.navigate(['/student/submit-task', task.id], {
        queryParams: {
          repositoryId: task.repositoryId,
          groupId: task.groupId
        }
      });
    } else {
      this.snackBar.open('No repository found for this task', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  viewSubmission(task: Task): void {
    // Navigate to view submission details
    this.router.navigate(['/student/submissions'], {
      queryParams: { taskId: task.id }
    });
  }

  formatDate(date: string | null): string {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  getDueDateClass(task: Task): string {
    if (!task.dueDate) return '';
    if (this.isOverdue(task.dueDate)) return 'overdue';
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) return 'due-soon';
    if (daysDiff <= 3) return 'due-warning';
    return '';
  }

  refresh(): void {
    this.loadAvailableTasks();
  }

  goBack(): void {
    this.router.navigate(['/student/submissions']);
  }

  selectTask(task: Task): void {
    this.router.navigate(['/student/tasks', task.id, 'submit']);
  }
}
