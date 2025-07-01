import { Component, OnInit } from '@angular/core';
import { Repository, RepositoryService, RepositoryStats } from '../../services/repository.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRepositories();
  }

  loadRepositories(): void {
    this.loading = true;
    this.repositoryService.getTeacherRepositories().subscribe({
      next: (repos) => {
        this.repositories = repos;
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

  onTabChange(event: any): void {
    this.activeTabIndex = event.index;
    switch (event.index) {
      case 0:
        this.activeTab = 'overview';
        break;
      case 1:
        this.activeTab = 'files';
        this.loadRepositoryFiles();
        break;
      case 2:
        this.activeTab = 'upload';
        break;
      case 3:
        this.activeTab = 'stats';
        this.loadRepositoryStats();
        break;
    }
  }

  // Drag and drop functionality
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    
    if (event.dataTransfer?.files) {
      this.selectedFiles = event.dataTransfer.files;
    }
  }

  onFileSelect(event: any): void {
    this.selectedFiles = event.target.files;
  }

  uploadFiles(): void {
    if (!this.selectedRepository || !this.selectedFiles || this.selectedFiles.length === 0) {
      this.snackBar.open('Please select files to upload', 'Close', { duration: 3000 });
      return;
    }

    if (!this.commitMessage.trim()) {
      this.snackBar.open('Please enter a commit message', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const uploads: Promise<any>[] = [];
    const filesArray = Array.from(this.selectedFiles);

    for (const file of filesArray) {
      const filePath = this.uploadPath ? `${this.uploadPath}/${file.name}` : file.name;
      
      const upload = new Promise<any>((resolve, reject) => {
        this.repositoryService.uploadFile(
          this.selectedRepository!.fullName,
          file,
          filePath,
          this.commitMessage,
          this.selectedBranch
        ).subscribe({
          next: (result) => resolve(result),
          error: (error) => reject(new Error(error))
        });
      });
      
      uploads.push(upload);
    }

    Promise.all(uploads).then(() => {
      this.loading = false;
      this.snackBar.open('Files uploaded successfully!', 'Close', { duration: 3000 });
      this.selectedFiles = null;
      this.commitMessage = '';
      this.uploadPath = '';
      
      // Reload files if on files tab
      if (this.activeTab === 'files') {
        this.loadRepositoryFiles();
      }
    }).catch((error) => {
      this.loading = false;
      console.error('Error uploading files:', error);
      this.snackBar.open('Failed to upload files', 'Close', { duration: 3000 });
    });
  }

  deleteFile(filePath: string): void {
    if (!this.selectedRepository) return;

    const confirmed = confirm(`Are you sure you want to delete ${filePath}?`);
    if (!confirmed) return;

    const commitMessage = `Delete ${filePath}`;
    
    this.repositoryService.deleteFile(
      this.selectedRepository.fullName,
      filePath.split(' (')[0], // Remove type indicator
      commitMessage,
      this.selectedBranch
    ).subscribe({
      next: () => {
        this.snackBar.open('File deleted successfully!', 'Close', { duration: 3000 });
        this.loadRepositoryFiles();
      },
      error: (error) => {
        console.error('Error deleting file:', error);
        this.snackBar.open('Failed to delete file', 'Close', { duration: 3000 });
      }
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  openRepository(): void {
    if (this.selectedRepository) {
      window.open(this.selectedRepository.url, '_blank');
    }
  }

  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Java': '#b07219',
      'Python': '#3572A5',
      'C++': '#f34b7d',
      'C#': '#239120',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Swift': '#ffac45',
      'Kotlin': '#F18E33',
      'HTML': '#e34c26',
      'CSS': '#1572B6',
      'Vue': '#4FC08D',
      'React': '#61DAFB'
    };
    return colors[language] || '#586069';
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('Copied to clipboard!', 'Close', { duration: 2000 });
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      // eslint-disable-next-line deprecation/deprecation
      const successful = document.execCommand('copy');
      if (successful) {
        this.snackBar.open('Copied to clipboard!', 'Close', { duration: 2000 });
      } else {
        this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 3000 });
      }
    } catch (err: unknown) {
      console.error('Copy to clipboard failed:', err);
      this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 3000 });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  getSelectedFilesArray(): File[] {
    if (!this.selectedFiles) return [];
    return Array.from(this.selectedFiles);
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj ?? {});
  }
}
