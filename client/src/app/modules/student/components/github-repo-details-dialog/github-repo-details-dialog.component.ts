import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Repository } from '../../services/student.service';

@Component({
  selector: 'app-github-repo-details-dialog',
  templateUrl: './github-repo-details-dialog.component.html',
  styleUrls: ['./github-repo-details-dialog.component.css']
})
export class GitHubRepoDetailsDialogComponent {
  
  constructor(
    public dialogRef: MatDialogRef<GitHubRepoDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { repository: Repository }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  openGitHub(): void {
    window.open(this.data.repository.url, '_blank');
  }

  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
