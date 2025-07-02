import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Repository, RepositoryService, RepositoryStats } from '../../services/repository.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.css']
})
export class RepositoriesComponent implements OnInit {
  repositories: Repository[] = [];
  selectedRepository: Repository | null = null;
  repositoryStats: RepositoryStats | null = null;
  repositoryFiles: string[] = [];
  repositoryBranches: string[] = [];
  selectedBranch: string = 'main';
  loading = false;
  searchTerm: string = '';
  
  // File upload
  dragOver = false;
  uploadPath = '';
  commitMessage = '';
  selectedFiles: FileList | null = null;

  // Tabs
  activeTab: 'overview' | 'files' | 'stats' | 'upload' = 'overview';
  activeTabIndex = 0;

  // Expose Object to template
  Object = Object;

  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRepositories();
  }

  // Utility for language color (simple fallback)
  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C#': '#178600',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Shell': '#89e051',
      'Go': '#00ADD8',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Kotlin': '#A97BFF',
      'Swift': '#ffac45',
      'Rust': '#dea584',
      'Dart': '#00B4AB',
      'Vue': '#41b883',
      'Angular': '#dd0031',
      'Other': '#cccccc'
    };
    return colors[language] || '#cccccc';
  }

  // Filtered repositories for search
  get filteredRepositories(): Repository[] {
    if (!this.searchTerm) return this.repositories;
    const term = this.searchTerm.toLowerCase();
    return this.repositories.filter(repo =>
      repo.name.toLowerCase().includes(term) ||
      (repo.description && repo.description.toLowerCase().includes(term)) ||
      (repo.language && repo.language.toLowerCase().includes(term))
    );
  }

  // Add repo action
  addRepository(): void {
    const name = prompt('Enter repository name:');
    if (!name || name.trim() === '') {
      this.snackBar.open('Repository name is required', 'Close', { 
        duration: 3000,
        panelClass: ['snackbar-error'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }

    const description = prompt('Enter repository description (optional):') || '';
    const isPrivateResponse = confirm('Should this repository be private? Click OK for private, Cancel for public.');

    this.repositoryService.createRepository(name.trim(), description.trim(), isPrivateResponse).subscribe({
      next: (newRepo) => {
        this.repositories.unshift(newRepo);
        this.snackBar.open(`Repository "${name}" created successfully!`, 'Close', { 
          duration: 5000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (error) => {
        console.error('Error creating repository:', error);
        let errorMessage = 'Failed to create repository';
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to create repositories.';
        }
        this.snackBar.open(errorMessage, 'Close', { 
          duration: 5000,
          panelClass: ['snackbar-error'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  loadRepositories(): void {
    this.loading = true;
    this.repositoryService.getTeacherRepositories().subscribe({
      next: (repos) => {
        this.repositories = repos;
        this.searchTerm = '';
        this.loading = false;
        if (repos.length === 0) {
          this.snackBar.open('No repositories found. Make sure your GitHub account is connected.', 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        console.error('Error loading repositories:', error);
        let errorMessage = 'Failed to load repositories';
        if (error.status === 401) {
          errorMessage = 'GitHub authentication failed. Please reconnect your GitHub account.';
        } else if (error.status === 403) {
          errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
        } else if (error.status === 404) {
          errorMessage = 'GitHub user not found. Please check your GitHub connection.';
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  selectRepository(repository: Repository): void {
    this.selectedRepository = repository;
    this.activeTab = 'overview';
    this.repositoryStats = null; // Reset stats when switching repositories
    this.repositoryFiles = []; // Reset files when switching repositories
    this.loadRepositoryBranches();
  }

  navigateToRepository(repository: Repository): void {
    const [owner, name] = repository.fullName.split('/');
    this.router.navigate(['/teacher/repositories', owner, name]);
  }

  loadRepositoryStats(): void {
    if (!this.selectedRepository) return;
    
    this.loading = true;
    console.log(`Loading stats for ${this.selectedRepository.fullName}`);
    this.repositoryService.getRepositoryStats(this.selectedRepository.fullName).subscribe({
      next: (stats) => {
        this.repositoryStats = stats;
        console.log('Repository stats loaded:', stats);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repository stats:', error);
        const repoName = this.selectedRepository?.name ?? 'repository';
        let errorMessage = `Failed to load statistics for '${repoName}'`;
        if (error.status === 404) {
          errorMessage = `Statistics not available for '${repoName}'.`;
        } else if (error.status === 403) {
          errorMessage = `Access denied to repository statistics.`;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }

  loadRepositoryFiles(): void {
    if (!this.selectedRepository) return;
    
    this.loading = true;
    console.log(`Loading files for ${this.selectedRepository.fullName} on branch ${this.selectedBranch}`);
    this.repositoryService.getRepositoryFiles(this.selectedRepository.fullName, this.selectedBranch).subscribe({
      next: (files) => {
        this.repositoryFiles = files || [];
        console.log(`Loaded ${this.repositoryFiles.length} files from branch '${this.selectedBranch}'`);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repository files:', error);
        let errorMessage = `Failed to load files from branch '${this.selectedBranch}'`;
        if (error.status === 404) {
          errorMessage = `Branch '${this.selectedBranch}' not found in repository.`;
        } else if (error.status === 403) {
          errorMessage = `Access denied to repository files.`;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 4000 });
        this.repositoryFiles = [];
        this.loading = false;
      }
    });
  }

  loadRepositoryBranches(): void {
    if (!this.selectedRepository) return;
    
    this.repositoryService.getRepositoryBranches(this.selectedRepository.fullName).subscribe({
      next: (branches) => {
        this.repositoryBranches = branches || [];
        this.selectedBranch = this.selectedRepository?.defaultBranch ?? 'main';
        console.log(`Loaded ${branches?.length ?? 0} branches for ${this.selectedRepository?.fullName}`);
        // Auto-load files for the overview tab
        if (this.activeTab === 'overview' || this.activeTab === 'files') {
          this.loadRepositoryFiles();
        }
      },
      error: (error) => {
        console.error('Error loading repository branches:', error);
        const repoName = this.selectedRepository?.name ?? 'repository';
        let errorMessage = `Failed to load branches for '${repoName}'`;
        if (error.status === 404) {
          errorMessage = `Repository '${repoName}' not found or no access.`;
        } else if (error.status === 403) {
          errorMessage = `Access denied to repository '${repoName}'.`;
        }
        this.snackBar.open(errorMessage, 'Close', { duration: 4000 });
        // Set default branch even if branches failed to load
        this.selectedBranch = this.selectedRepository?.defaultBranch ?? 'main';
        this.repositoryBranches = [this.selectedBranch];
      }
    });
  }

  onBranchChange(): void {
    if (this.activeTab === 'files') {
      this.loadRepositoryFiles();
    }
  }

  setActiveTab(tab: 'overview' | 'files' | 'stats' | 'upload'): void {
    this.activeTab = tab;
    
    switch (tab) {
      case 'files':
        this.loadRepositoryFiles();
        break;
      case 'stats':
        this.loadRepositoryStats();
        break;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}
