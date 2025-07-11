
import { Component, OnInit } from '@angular/core';
import { StudentService, Repository } from '../../services/student.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
 
interface EnhancedRepository extends Repository {
  // Dynamic data
  totalCommits?: number;
  contributors?: any[];
  languages?: any;
  lastCommitDate?: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  recentActivity?: string;
  fileCount?: number;
  branchCount?: number;
  // Loading states
  loadingStats?: boolean;
  statsLoaded?: boolean;
}
 
@Component({
  selector: 'app-student-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.css']
})
export class StudentRepositoriesComponent implements OnInit {
  repositories: EnhancedRepository[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private readonly studentService: StudentService,
    private http: HttpClient
  ) {}
  exportRepositoriesCsv(): void {
    this.http.get(environment.apiUrl + '/v1/repositories/export', { responseType: 'blob' }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'repositories.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
 
  ngOnInit(): void {
    this.loadRepositories();
  }
 
  loadRepositories(): void {
    this.loading = true;
    this.error = null;
 
    this.studentService.getAllGitHubRepositories().subscribe({
      next: (repositories) => {
        console.log('Loaded GitHub repositories:', repositories);
        this.repositories = repositories;
        this.loading = false;
 
        // Load only branch count for each repository
        this.loadBranchCounts();
      },
      error: (error) => {
        console.error('Error loading GitHub repositories:', error);
        this.error = 'Failed to load repositories. Please try again.';
        this.loading = false;
      }
    });
  }
 
  private loadBranchCounts(): void {
    this.repositories.forEach((repo, index) => {
      if (repo.fullName) {
        const [owner, repoName] = repo.fullName.split('/');
        if (owner && repoName) {
          this.studentService.getRepositoryBranches(owner, repoName).pipe(
            catchError(error => {
              console.warn(`Failed to load branches for ${owner}/${repoName}:`, error);
              return of([]);
            })
          ).subscribe(branches => {
            this.repositories[index].branchCount = branches ? branches.length : 0;
          });
        }
      }
    });
  }
 
  refresh(): void {
    this.loadRepositories();
  }
 
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }
 
  // Helper methods for template
  formatCreatedDate(dateString: string | Date): string {
    if (!dateString) return 'Unknown';
 
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 
    if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
 
getGitHubUrl(repo: any): string {
  const url = repo.url || `https://github.com/${repo.fullName}`;
  
  // Convert git:// to https:// if necessary
  if (url.startsWith('git://')) {
    return url.replace('git://', 'https://');
  }
  
  return url;
}
}