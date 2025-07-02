import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';

@Component({
  selector: 'app-github-repo-details',
  templateUrl: './github-repo-details.component.html',
  styleUrls: ['./github-repo-details.component.css']
})
export class GitHubRepoDetailsComponent implements OnInit {
  repository: any = null;
  loading = true;
  error: string | null = null;
  showCodeDropdown = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const repoId = params['id'];
      if (repoId) {
        this.loadRepositoryDetails(repoId);
      } else {
        this.error = 'Repository ID not provided';
        this.loading = false;
      }
    });
  }

  loadRepositoryDetails(repoId: string): void {
    this.loading = true;
    this.error = null;

    this.studentService.getRepositoryDetails(repoId).subscribe({
      next: (repository) => {
        this.repository = repository;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repository details:', error);
        this.error = 'Failed to load repository details. Please try again.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/student/repositories']);
  }

  openGitHub(): void {
    if (this.repository?.url) {
      window.open(this.repository.url, '_blank');
    }
  }

  toggleCodeDropdown(): void {
    this.showCodeDropdown = !this.showCodeDropdown;
  }

  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`${type} copied to clipboard`);
      // You could show a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  getRelativeTime(date: Date | string): string {
    if (!date) return 'Unknown';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 365)} year${Math.floor(diffInDays / 365) > 1 ? 's' : ''} ago`;
  }

  formatDate(date: Date | string): string {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString();
  }

  getLanguagesList(): any[] {
    if (!this.repository?.languages) return [];
    
    return Object.entries(this.repository.languages).map(([name, percentage]) => ({
      name,
      percentage: Number(percentage)
    })).sort((a, b) => b.percentage - a.percentage);
  }

  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'Java': '#b07219',
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Python': '#3572a5',
      'C++': '#f34b7d',
      'C#': '#239120',
      'PHP': '#4f5d95',
      'Ruby': '#701516',
      'Go': '#00add8',
      'Rust': '#dea584',
      'Swift': '#ffac45',
      'Kotlin': '#f18e33'
    };
    return colors[language] || '#6c757d';
  }

  getFileIcon(type: string): string {
    if (type === 'folder') return 'fas fa-folder';
    return 'fas fa-file';
  }
}
