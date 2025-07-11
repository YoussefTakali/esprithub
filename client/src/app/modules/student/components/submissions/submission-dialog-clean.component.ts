import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SubmissionService, RepositoryCommit, CreateSubmissionRequest } from '../../../../shared/services/submission.service';
import { StudentService, StudentTask } from '../../services/student.service';

export interface SubmissionDialogData {
  task: StudentTask;
}

@Component({
  selector: 'app-submission-dialog',
  template: `
    <div class="submission-dialog">
      <h2>Submit Task: {{ data.task.title }}</h2>
      
      <form [formGroup]="submissionForm" (ngSubmit)="onSubmit()">
        <!-- Repository Info -->
        <div *ngIf="data.task.groupId" class="form-section">
          <h3>Repository</h3>
          <p class="repository-info">
            <strong>Group:</strong> {{ data.task.groupName || 'Group Project' }}<br>
            <strong>Task Type:</strong> {{ data.task.type }}
          </p>
        </div>

        <!-- Commit Selection -->
        <div class="form-section">
          <h3>Select Commit to Submit</h3>
          <div *ngIf="loadingCommits" class="loading">Loading commits...</div>
          <div *ngIf="commitsError" class="error">{{ commitsError }}</div>
          
          <div *ngIf="!loadingCommits && !commitsError && commits.length > 0" class="commits-list">
            <div *ngFor="let commit of commits" 
                 class="commit-item" 
                 [class.selected]="selectedCommit?.id === commit.id"
                 (click)="selectCommit(commit)">
              <div class="commit-info">
                <div class="commit-hash">{{ commit.sha.substring(0, 8) }}</div>
                <div class="commit-message">{{ commit.message }}</div>
                <div class="commit-meta">
                  <span>{{ commit.authorName }}</span>
                  <span class="commit-date">{{ formatDate(commit.authorDate) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="!loadingCommits && commits.length === 0 && !commitsError" class="no-commits">
            No commits found in the repository.
          </div>
        </div>

        <!-- Notes Section -->
        <div class="form-section">
          <label for="notes">Submission Notes (Optional)</label>
          <textarea 
            id="notes"
            formControlName="notes" 
            placeholder="Add any notes about your submission..."
            rows="3">
          </textarea>
        </div>

        <!-- Actions -->
        <div class="dialog-actions">
          <button type="button" class="btn-secondary" (click)="close()">Cancel</button>
          <button type="submit" 
                  class="btn-primary" 
                  [disabled]="!selectedCommit || submitting">
            {{ submitting ? 'Submitting...' : 'Submit Task' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .submission-dialog {
      width: 600px;
      max-width: 90vw;
      padding: 20px;
    }

    .submission-dialog h2 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .form-section {
      margin-bottom: 25px;
    }

    .form-section h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 16px;
    }

    .repository-info {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      color: #666;
    }

    .commits-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e9ecef;
      border-radius: 4px;
    }

    .commit-item {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .commit-item:hover {
      background-color: #f8f9fa;
    }

    .commit-item.selected {
      background-color: #e3f2fd;
      border-left: 4px solid #007bff;
    }

    .commit-hash {
      font-family: monospace;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 5px;
    }

    .commit-message {
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .commit-meta {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #666;
    }

    .loading, .error, .no-commits {
      text-align: center;
      padding: 20px;
      color: #666;
    }

    .error {
      color: #dc3545;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #333;
    }

    textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-family: inherit;
      resize: vertical;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-primary {
      background-color: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .btn-primary:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #545b62;
    }
  `]
})
export class SubmissionDialogComponent implements OnInit {
  submissionForm: FormGroup;
  commits: RepositoryCommit[] = [];
  selectedCommit: RepositoryCommit | null = null;
  loadingCommits = true;
  commitsError: string | null = null;
  submitting = false;

  constructor(
    public dialogRef: MatDialogRef<SubmissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubmissionDialogData,
    private readonly fb: FormBuilder,
    private readonly submissionService: SubmissionService,
    private readonly studentService: StudentService
  ) {
    this.submissionForm = this.fb.group({
      notes: ['']
    });
  }

  ngOnInit(): void {
    console.log('Initializing submission dialog for task:', this.data.task);
    
    if (this.data.task.groupId) {
      console.log('Task has group ID:', this.data.task.groupId);
      this.loadRepositoryFromGroup(this.data.task.groupId);
    } else {
      console.log('Task has no group ID, cannot load repository');
      this.commitsError = 'This task is not associated with a group/repository';
      this.loadingCommits = false;
    }
  }

  loadRepositoryFromGroup(groupId: string): void {
    console.log('Loading repositories for group:', groupId);
    
    this.studentService.getGroupRepositories(groupId).subscribe({
      next: (repositories) => {
        console.log('Group repositories:', repositories);
        
        if (repositories && repositories.length > 0) {
          const repo = repositories[0]; // Use the first repository
          console.log('Using repository:', repo);
          this.loadCommitsFromRepository(repo.id);
        } else {
          console.log('No repositories found for group');
          this.commitsError = 'No repository found for this group';
          this.loadingCommits = false;
        }
      },
      error: (error) => {
        console.error('Error loading group repositories:', error);
        this.commitsError = 'Failed to load group repository information';
        this.loadingCommits = false;
      }
    });
  }

  loadCommitsFromRepository(repositoryId: string): void {
    console.log('Loading commits from repository:', repositoryId);

    this.submissionService.getRepositoryCommits(repositoryId, 0, 10).subscribe({
      next: (response) => {
        console.log('Commits response:', response);
        this.commits = response.commits || [];
        this.loadingCommits = false;
        
        if (this.commits.length === 0) {
          this.commitsError = 'No commits found in repository';
        }
      },
      error: (error) => {
        console.error('Error loading commits:', error);
        this.commitsError = 'Failed to load commits from repository: ' + (error.message || 'Unknown error');
        this.loadingCommits = false;
      }
    });
  }

  selectCommit(commit: RepositoryCommit): void {
    this.selectedCommit = commit;
    console.log('Selected commit:', commit);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (!this.selectedCommit) return;

    this.submitting = true;

    const request: CreateSubmissionRequest = {
      taskId: this.data.task.id,
      commitHash: this.selectedCommit.sha,
      groupId: this.data.task.groupId || undefined,
      notes: this.submissionForm.get('notes')?.value || undefined
    };

    console.log('Submitting with request:', request);

    this.submissionService.createSubmission(request).subscribe({
      next: (submission) => {
        console.log('Submission created successfully:', submission);
        this.dialogRef.close({ ...submission, submitted: true });
      },
      error: (error) => {
        console.error('Error creating submission:', error);
        this.submitting = false;
        alert('Failed to create submission: ' + (error.message || 'Unknown error'));
      }
    });
  }
}
