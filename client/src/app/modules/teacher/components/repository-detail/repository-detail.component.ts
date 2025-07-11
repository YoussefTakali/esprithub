import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Repository, RepositoryService, RepositoryStats, UserSummary } from '../../services/repository.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-repository-detail',
  templateUrl: './repository-detail.component.html',
  styleUrls: ['./repository-detail.component.css']
})
export class RepositoryDetailComponent implements OnInit, OnDestroy {
  // Enhanced getFileFaIcon method with proper icon mapping
  getFileFaIcon(fileName: string): string[] {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext) return ['fas', 'fa-file'];
    
    // Images
    if ([
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp', 'ico', 'tiff', 'tif'
    ].includes(ext)) return ['fas', 'fa-file-image'];
    
    // Documents
    if (['pdf'].includes(ext)) return ['fas', 'fa-file-pdf'];
    if (['doc', 'docx'].includes(ext)) return ['fas', 'fa-file-word'];
    if (['xls', 'xlsx'].includes(ext)) return ['fas', 'fa-file-excel'];
    if (['ppt', 'pptx'].includes(ext)) return ['fas', 'fa-file-powerpoint'];
    
    // Archives
    if ([
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'
    ].includes(ext)) return ['fas', 'fa-file-archive'];
    
    // Audio
    if ([
      'mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'
    ].includes(ext)) return ['fas', 'fa-file-audio'];
    
    // Video
    if ([
      'mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v'
    ].includes(ext)) return ['fas', 'fa-file-video'];
    
    // Code files
    if ([
      'js', 'ts', 'jsx', 'tsx', 'java', 'py', 'cpp', 'c', 'cs', 'rb', 'go', 
      'php', 'rs', 'swift', 'kt', 'dart', 'scala', 'r', 'sh', 'bash', 'ps1'
    ].includes(ext)) return ['fas', 'fa-file-code'];
    
    // Web files
    if (['html', 'htm', 'xml', 'xhtml'].includes(ext)) return ['fab', 'fa-html5'];
    if (['css', 'scss', 'sass', 'less', 'stylus'].includes(ext)) return ['fab', 'fa-css3-alt'];
    
    // Config/Data files
    if ([
      'json', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env'
    ].includes(ext)) return ['fas', 'fa-cog'];
    
    // Text files
    if (['md', 'markdown', 'rst'].includes(ext)) return ['fab', 'fa-markdown'];
    if (['txt', 'log', 'readme'].includes(ext)) return ['fas', 'fa-file-alt'];
    
    // Database
    if (['sql', 'db', 'sqlite', 'mdb'].includes(ext)) return ['fas', 'fa-database'];
    
    // Fonts
    if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) return ['fas', 'fa-font'];
    
    // Default
    return ['fas', 'fa-file'];
  }

  repository: Repository | null = null;
  repositoryStats: RepositoryStats | null = null;
  repositoryFiles: any[] = [];
  repositoryBranches: string[] = [];
  repositoryCollaborators: any[] = [];
  selectedBranch: string = 'main';
  loading = false;
  currentPath: string = '';
  activeTab: 'code' | 'settings' | 'branches' | 'collaborators' | 'commits' = 'code';
  
  // Repository details
  repoOwner: string = '';
  repoName: string = '';
  
  get repositoryDescription(): string {
    return this.repository?.description ?? '';
  }
  
  set repositoryDescription(value: string) {
    if (this.repository) {
      this.repository.description = value;
    }
  }
  
  // Settings tab properties
  settingsTab: 'general' | 'collaborators' | 'branches' | 'commits' | 'delete' = 'general';
  showAddCollab = false;
  showBranchDropdown = false;
  collaborator = '';
  userSuggestions: UserSummary[] = [];
  showUserSuggestions = false;
  newBranchName = '';
  branchSearch = '';
  showCreateBranchInput = false;
  deleteInput = '';
  branchSuccessMessage = '';
  branchErrorMessage = '';

  // Commit data
  recentCommits: any[] = [];
  latestCommitBanner: any = null;
  commitCount: number = 0;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly repositoryService: RepositoryService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.params.subscribe((params: any) => {
        this.repoOwner = params['owner'];
        this.repoName = params['name'];
        this.loadRepository();
      })
    );

    this.subscriptions.add(
      this.route.queryParams.subscribe((params: any) => {
        this.activeTab = params['tab'] ?? 'code';
        this.selectedBranch = params['branch'] ?? 'main';
        this.currentPath = params['path'] ?? '';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadRepository(): void {
    if (!this.repoOwner || !this.repoName) return;
    
    this.loading = true;
    const fullName = `${this.repoOwner}/${this.repoName}`;
    
    this.repositoryService.getTeacherRepositories().subscribe({
      next: (repos: Repository[]) => {
        this.repository = repos.find((repo: Repository) => repo.fullName === fullName) || null;
        if (this.repository) {
          this.selectedBranch = this.repository.defaultBranch || 'main';
          this.loadRepositoryBranches();
          this.loadRepositoryFiles();
          this.loadRepositoryStats();
          this.loadRepositoryCollaborators();
          this.loadLatestCommit();
        } else {
          this.showErrorSnackbar('Repository not found');
          this.router.navigate(['/teacher/repositories']);
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading repository:', error);
        this.showErrorSnackbar('Failed to load repository');
        this.loading = false;
      }
    });
  }

  loadRepositoryBranches(): void {
    if (!this.repository) return;
    
    this.repositoryService.getRepositoryBranches(this.repository.fullName).subscribe({
      next: (branches: string[]) => {
        this.repositoryBranches = branches ?? [];
      },
      error: (error: any) => {
        console.error('Error loading branches:', error);
        this.showErrorSnackbar('Failed to load repository branches');
      }
    });
  }

  loadRepositoryFiles(): void {
    if (!this.repository) return;
    
    this.repositoryService.getRepositoryFiles(this.repository.fullName, this.selectedBranch).subscribe({
      next: (files: any[]) => {
        this.repositoryFiles = files ?? [];
      },
      error: (error: any) => {
        console.error('Error loading files:', error);
        this.showErrorSnackbar('Failed to load repository files');
      }
    });
  }

  loadRepositoryStats(): void {
    if (!this.repository) return;
    this.loading = true;
    this.repositoryService.getRepositoryStats(this.repository.fullName).subscribe({
      next: (stats: RepositoryStats) => {
        this.repositoryStats = stats;
        this.recentCommits = (stats.recentCommits || []).map((commit: any) => ({
          message: commit.message,
          author: commit.author,
          date: commit.date,
          sha: commit.sha,
          url: commit.url,
          avatarUrl: commit.avatarUrl || `https://github.com/identicons/${encodeURIComponent(commit.author)}.png`
        }));
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading stats:', error);
        this.showErrorSnackbar('Failed to load repository statistics');
        this.loading = false;
      }
    });
  }

  loadRepositoryCollaborators(): void {
    if (!this.repository) return;
    this.repositoryService.getCollaborators(this.repository.fullName).subscribe({
      next: (collaborators: any[]) => {
        this.repositoryCollaborators = collaborators ?? [];
      },
      error: (error: any) => {
        console.error('Error loading collaborators:', error);
        this.showErrorSnackbar('Failed to load repository collaborators');
      }
    });
  }

  loadLatestCommit(): void {
    if (!this.repository) return;

    const [owner, repo] = this.repository.fullName.split('/');

    this.repositoryService.getLatestCommit(owner, repo, '', this.selectedBranch).subscribe({
      next: (commits: any) => {
        if (commits && commits.length > 0) {
          const latestCommit = commits[0];
          const commitDate = new Date(latestCommit.commit.author.date);
          const now = new Date();
          const diffInMs = now.getTime() - commitDate.getTime();

          this.latestCommitBanner = {
            author: latestCommit.commit.author.name,
            message: latestCommit.commit.message,
            sha: latestCommit.sha.substring(0, 7),
            time: latestCommit.commit.author.date,
            avatarUrl: latestCommit.author?.avatar_url || `https://github.com/identicons/${encodeURIComponent(latestCommit.commit.author.name)}.png`
          };
          this.commitCount = commits.length;
        }
      },
      error: (error: any) => {
        console.error('Error loading latest commit:', error);
      }
    });
  }

  switchTab(tab: 'code' | 'settings' | 'branches' | 'collaborators' | 'commits'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, branch: this.selectedBranch, path: this.currentPath },
      queryParamsHandling: 'merge'
    });

    switch (tab) {
      case 'code':
        this.loadRepositoryFiles();
        break;
      case 'branches':
        this.loadRepositoryBranches();
        break;
      case 'commits':
        this.loadRepositoryStats();
        break;
    }
  }

  switchBranch(branch: string): void {
    this.selectedBranch = branch;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { branch, path: '' },
      queryParamsHandling: 'merge'
    });
    this.currentPath = '';
    this.loadRepositoryFiles();
    this.showBranchDropdown = false;
    
    this.snackBar.open(`Switched to branch: ${branch}`, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
  }

  toggleBranchDropdown(): void {
    this.showBranchDropdown = !this.showBranchDropdown;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.branch-dropdown')) {
      this.showBranchDropdown = false;
    }
  }

  navigateToPath(path: string): void {
    this.currentPath = path;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { path },
      queryParamsHandling: 'merge'
    });
    this.loadRepositoryFiles();
  }

  goBack(): void {
    this.router.navigate(['/teacher/repositories']);
  }

  openRepository(): void {
    if (this.repository) {
      window.open(this.repository.url, '_blank');
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C#': '#239120',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Swift': '#fa7343',
      'Kotlin': '#F18E33',
      'Dart': '#00B4AB',
      'HTML': '#e34c26',
      'CSS': '#1572B6',
      'Vue': '#4FC08D',
      'React': '#61DAFB'
    };
    return colors[language] || '#586069';
  }

  updateRepositorySettings(): void {
    if (!this.repository) return;
    
    const settings = {
      description: this.repositoryDescription
    };
    
    this.repositoryService.updateRepository(this.repository.fullName, settings).subscribe({
      next: () => {
        this.showSuccessSnackbar('Repository settings updated successfully');
        if (this.repository) {
          this.repository.description = this.repositoryDescription;
        }
      },
      error: (error: any) => {
        console.error('Error updating repository settings:', error);
        let errorMessage = 'Failed to update repository settings';
        
        if (error?.error?.error) {
          errorMessage = error.error.error;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.showErrorSnackbar(errorMessage);
      }
    });
  }

  setSettingsTab(tab: 'general' | 'collaborators' | 'branches' | 'commits' | 'delete'): void {
    this.settingsTab = tab;
    switch (tab) {
      case 'branches':
        this.loadRepositoryBranches();
        break;
      case 'commits':
        this.loadRepositoryStats();
        break;
      case 'collaborators':
        this.loadRepositoryCollaborators();
        break;
    }
    
    const tabNames = {
      'general': 'General Settings',
      'collaborators': 'Collaborators',
      'branches': 'Branches',
      'commits': 'Commits',
      'delete': 'Delete Repository'
    };
    
    this.showSuccessSnackbar(`Switched to ${tabNames[tab]}`);
  }

  addCollaborator(): void {
    if (this.collaborator.trim() && this.repository) {
      this.repositoryService.addCollaborator(this.repository.fullName, this.collaborator).subscribe({
        next: () => {
          this.showSuccessSnackbar(`Invitation sent to ${this.collaborator}`);
          this.collaborator = '';
          this.showAddCollab = false;
          this.loadRepositoryCollaborators();
        },
        error: (error: any) => {
          console.error('Error adding collaborator:', error);
          let errorMessage = 'Failed to add collaborator';

          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.showErrorSnackbar(errorMessage);
        }
      });
    } else {
      this.showWarningSnackbar('Please enter a valid username or email');
    }
  }

  removeCollaborator(collaborator: string): void {
    if (confirm(`Remove ${collaborator} from this repository?`) && this.repository) {
      this.repositoryService.removeCollaborator(this.repository.fullName, collaborator).subscribe({
        next: () => {
          this.showSuccessSnackbar(`Removed ${collaborator} from repository`);
          this.loadRepositoryCollaborators();
        },
        error: (error: any) => {
          console.error('Error removing collaborator:', error);
          let errorMessage = 'Failed to remove collaborator';
          
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.showErrorSnackbar(errorMessage);
        }
      });
    }
  }

  createCollaboratorBranch(username: string): void {
    if (!this.repository || !username) return;

    const branchName = username.toLowerCase().replace(/[^a-z0-9]/g, '-');

    this.repositoryService.createBranch(this.repository.fullName, branchName, this.selectedBranch).subscribe({
      next: () => {
        this.showSuccessSnackbar(`Branch "${branchName}" created for ${username}`);
        this.loadRepositoryBranches();
      },
      error: (error: any) => {
        console.error('Error creating branch for collaborator:', error);
        let errorMessage = 'Failed to create branch';

        if (error?.error?.error) {
          errorMessage = error.error.error;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.showErrorSnackbar(errorMessage);
      }
    });
  }

  onCollaboratorInputChange(): void {
    const query = this.collaborator.trim();
    if (query.length > 2) {
      this.repositoryService.searchUsers(query).subscribe({
        next: (users: UserSummary[]) => {
          this.userSuggestions = users;
          this.showUserSuggestions = users.length > 0;
        },
        error: (error: any) => {
          console.error('Error searching users:', error);
          this.userSuggestions = [];
          this.showUserSuggestions = false;
        }
      });
    } else {
      this.userSuggestions = [];
      this.showUserSuggestions = false;
    }
  }

  selectUser(user: UserSummary): void {
    this.collaborator = user.email;
    this.userSuggestions = [];
    this.showUserSuggestions = false;
  }

  hideUserSuggestions(): void {
    setTimeout(() => {
      this.showUserSuggestions = false;
    }, 200);
  }

  toggleCreateBranch(): void {
    this.showCreateBranchInput = !this.showCreateBranchInput;
    this.newBranchName = '';
  }

  createBranch(): void {
    if (this.newBranchName.trim() && this.repository) {
      this.repositoryService.createBranch(this.repository.fullName, this.newBranchName, this.selectedBranch).subscribe({
        next: () => {
          this.branchSuccessMessage = `Branch "${this.newBranchName}" created successfully!`;
          this.branchErrorMessage = '';
          this.showSuccessSnackbar(`Branch "${this.newBranchName}" created successfully!`);
          this.newBranchName = '';
          this.showCreateBranchInput = false;
          this.loadRepositoryBranches();
          
          setTimeout(() => {
            this.branchSuccessMessage = '';
          }, 3000);
        },
        error: (error: any) => {
          console.error('Error creating branch:', error);
          let errorMessage = 'Failed to create branch';
          
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.branchErrorMessage = errorMessage;
          this.showErrorSnackbar(errorMessage);
        }
      });
    } else {
      this.branchErrorMessage = 'Please enter a valid branch name';
      this.showWarningSnackbar('Please enter a valid branch name');
    }
  }

  deleteBranch(branchName: string): void {
    if (confirm(`Delete branch "${branchName}"? This cannot be undone.`) && this.repository) {
      this.repositoryService.deleteBranch(this.repository.fullName, branchName).subscribe({
        next: () => {
          this.showSuccessSnackbar(`Branch "${branchName}" deleted successfully`);
          this.loadRepositoryBranches();
        },
        error: (error: any) => {
          console.error('Error deleting branch:', error);
          let errorMessage = 'Failed to delete branch';
          
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.showErrorSnackbar(errorMessage);
        }
      });
    }
  }

  filteredBranches(): string[] {
    if (!this.repositoryBranches) return [];
    
    if (!this.branchSearch.trim()) {
      return this.repositoryBranches.filter(branch => branch !== this.selectedBranch);
    }
    
    return this.repositoryBranches.filter(branch => 
      branch !== this.selectedBranch && 
      branch.toLowerCase().includes(this.branchSearch.toLowerCase())
    );
  }

  confirmDelete(): void {
    if (this.deleteInput === this.repoName && this.repository) {
      if (confirm('This will permanently delete the repository. Are you absolutely sure?')) {
        this.repositoryService.deleteRepository(this.repository.fullName).subscribe({
          next: () => {
            this.showSuccessSnackbar(`Repository "${this.repoName}" deleted successfully`);
            this.router.navigate(['/teacher/repositories']);
          },
          error: (error: any) => {
            console.error('Error deleting repository:', error);
            let errorMessage = 'Failed to delete repository';
            
            if (error?.error?.error) {
              if (error.error.error.includes('Must have admin rights')) {
                errorMessage = 'Permission denied: You must have admin rights to delete this repository';
              } else if (error.error.error.includes('403')) {
                errorMessage = 'Access denied: Insufficient permissions to delete repository';
              } else {
                errorMessage = error.error.error;
              }
            } else if (error?.message) {
              errorMessage = error.message;
            }
            
            this.showErrorSnackbar(errorMessage);
          }
        });
      }
    } else {
      this.showWarningSnackbar('Repository name does not match. Please try again.');
    }
  }

  // File viewing properties
  selectedFile: { name: string, content: string, imageUrl?: string } | null = null;
  showFileModal = false;
  loadingFileContent = false;

  viewFile(file: any): void {
    if (!this.repository) {
      this.showErrorSnackbar('Repository not loaded');
      return;
    }
    
    this.viewFileFromGithub(file);
  }

  viewFileFromGithub(file: any): void {
    let fileName = file.fileName || file.filePath || file;
    fileName = fileName.replace(/\s*\(file\)$/i, '');
    const filePath = this.currentPath ? `${this.currentPath}/${fileName}` : fileName;
    const [owner, repo] = this.repository!.fullName.split('/');

    this.loadingFileContent = true;
    this.showFileModal = true;
    this.selectedFile = { name: fileName, content: 'Loading...', imageUrl: undefined };

    this.repositoryService.getFileContent(`${owner}/${repo}`, filePath, this.selectedBranch)
      .subscribe({
        next: (response: any) => {
          if (response.content) {
            const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(fileName);
            if (isImage) {
              let ext = fileName.split('.').pop()?.toLowerCase() || '';
              let mime = 'image/' + (ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext);
              this.selectedFile = {
                name: fileName,
                content: '',
                imageUrl: `data:${mime};base64,${response.content}`
              };
            } else {
              this.selectedFile = {
                name: fileName,
                content: atob(response.content)
              };
            }
          } else if (response.download_url) {
            this.repositoryService.getRawFileContent(response.download_url)
              .subscribe({
                next: (content: string) => {
                  this.selectedFile = {
                    name: fileName,
                    content: content
                  };
                },
                error: (error) => {
                  this.handleFileError(fileName, error);
                }
              });
          }
          this.loadingFileContent = false;
        },
        error: (error) => {
          this.handleFileError(fileName, error);
        }
      });
  }

  private handleFileError(fileName: string, error: any): void {
    console.error('Error loading file content:', error);
    this.selectedFile = {
      name: fileName,
      content: 'Error loading file content: ' + (error.message || 'Unknown error')
    };
    this.loadingFileContent = false;
    this.showErrorSnackbar('Failed to load file content');
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.showSuccessSnackbar('Copied to clipboard!');
  }

  closeFileModal(): void {
    this.showFileModal = false;
    this.selectedFile = null;
    this.loadingFileContent = false;
  }

  onImageError(event: Event, authorName: string) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = `https://github.com/identicons/${encodeURIComponent(authorName)}.png`;
    }
  }

  encodeURI(text: string): string {
    return encodeURIComponent(text);
  }

  // Helper methods for snackbars
  private showSuccessSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar', 'success-snackbar']
    });
  }

  private showErrorSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar', 'error-snackbar']
    });
  }

  private showWarningSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar', 'warning-snackbar']
    });
  }
}