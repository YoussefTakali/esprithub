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
  repository: Repository | null = null;
  repositoryStats: RepositoryStats | null = null;
  repositoryFiles: string[] = [];
  repositoryBranches: string[] = [];
  repositoryCollaborators: any[] = [];
  selectedBranch: string = 'main';
  loading = false;
  currentPath: string = '';
  activeTab: 'code' | 'settings' | 'branches' | 'collaborators' | 'commits' = 'code';
  
  // Repository details
  repoOwner: string = '';
  repoName: string = '';
  
  // Getter and setter for repository description to handle two-way binding
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

  // Add a property to hold recent commits for the template
  recentCommits: any[] = [];

  // Latest commit banner data
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
          this.snackBar.open('Repository not found', 'Close', { 
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'error-snackbar']
          });
          this.router.navigate(['/teacher/repositories']);
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading repository:', error);
        this.snackBar.open('Failed to load repository', 'Close', { 
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  loadRepositoryBranches(): void {
    if (!this.repository) return;
    
    console.log('Loading branches for repository:', this.repository.fullName);
    this.repositoryService.getRepositoryBranches(this.repository.fullName).subscribe({
      next: (branches: string[]) => {
        console.log('Received branches:', branches);
        this.repositoryBranches = branches ?? [];
        console.log('Set repositoryBranches to:', this.repositoryBranches);
      },
      error: (error: any) => {
        console.error('Error loading branches:', error);
        this.snackBar.open('Failed to load repository branches', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  loadRepositoryFiles(): void {
    if (!this.repository) return;
    
    this.repositoryService.getRepositoryFiles(this.repository.fullName, this.selectedBranch).subscribe({
      next: (files: string[]) => {
        this.repositoryFiles = files ?? [];
      },
      error: (error: any) => {
        console.error('Error loading files:', error);
        this.snackBar.open('Failed to load repository files', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  loadRepositoryStats(): void {
    if (!this.repository) return;
    this.loading = true;
    this.repositoryService.getRepositoryStats(this.repository.fullName).subscribe({
      next: (stats: RepositoryStats) => {
        this.repositoryStats = stats;
        // Process and expose all commit details for the template
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
        this.snackBar.open('Failed to load repository statistics', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
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
        this.snackBar.open('Failed to load repository collaborators', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  // GitHub-like helper methods
  getRandomCommitHash(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  getRandomCommitMessage(): string {
    const messages = [
      'Update README.md',
      'Fix bug in authentication',
      'Add new feature',
      'Refactor code structure',
      'Update dependencies',
      'Initial commit',
      'Fix styling issues'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  getRandomDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toLocaleDateString();
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js': case 'ts': return 'javascript';
      case 'html': case 'htm': return 'code';
      case 'css': case 'scss': case 'sass': return 'palette';
      case 'json': return 'data_object';
      case 'md': return 'description';
      case 'txt': return 'text_snippet';
      case 'pdf': return 'picture_as_pdf';
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': return 'image';
      case 'zip': case 'rar': case '7z': return 'archive';
      case 'mp4': case 'avi': case 'mov': return 'movie';
      case 'mp3': case 'wav': case 'flac': return 'audio_file';
      default: 
        return fileName.includes('.') ? 'description' : 'folder';
    }
  }

  switchTab(tab: 'code' | 'settings' | 'branches' | 'collaborators' | 'commits'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, branch: this.selectedBranch, path: this.currentPath },
      queryParamsHandling: 'merge'
    });

    // Load data based on active tab
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
    this.showBranchDropdown = false; // Close dropdown after selection
    
    console.log('Opening snackbar for branch switch:', branch);
    const snackBarRef = this.snackBar.open(`Switched to branch: ${branch}`, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
    console.log('Snackbar ref:', snackBarRef);
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

  testSnackbar(): void {
    console.log('Testing snackbar...');
    const snackBarRef = this.snackBar.open('Test snackbar message!', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
    console.log('Test snackbar ref:', snackBarRef);
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

    console.log('Date comparison:', { dateString, date, now, diffInMs, diffInMinutes, diffInHours });

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

  // Update repository settings
  updateRepositorySettings(): void {
    if (!this.repository) return;
    
    const settings = {
      description: this.repositoryDescription
    };
    
    this.repositoryService.updateRepository(this.repository.fullName, settings).subscribe({
      next: () => {
        this.snackBar.open('Repository settings updated successfully', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar']
        });
        // Update the local repository object
        if (this.repository) {
          this.repository.description = this.repositoryDescription;
        }
      },
      error: (error: any) => {
        console.error('Error updating repository settings:', error);
        let errorMessage = 'Failed to update repository settings';
        
        // Extract more specific error message if available
        if (error?.error?.error) {
          errorMessage = error.error.error;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.snackBar.open(errorMessage, 'Close', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  // Settings tab navigation
  setSettingsTab(tab: 'general' | 'collaborators' | 'branches' | 'commits' | 'delete'): void {
    this.settingsTab = tab;
    // Load data based on the tab selected
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
    
    this.snackBar.open(`Switched to ${tabNames[tab]}`, 'Close', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
  }

  // Collaborator management
  addCollaborator(): void {
    if (this.collaborator.trim() && this.repository) {
      // Call backend to add collaborator
      this.repositoryService.addCollaborator(this.repository.fullName, this.collaborator).subscribe({
        next: () => {
          this.snackBar.open(`Invitation sent to ${this.collaborator}`, 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar']
          });
          this.collaborator = '';
          this.showAddCollab = false;
          // Reload collaborators to get updated list including pending invitations
          this.loadRepositoryCollaborators();
        },
        error: (error: any) => {
          console.error('Error adding collaborator:', error);
          let errorMessage = 'Failed to add collaborator';

          // Extract more specific error message if available
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.snackBar.open(errorMessage, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'error-snackbar']
          });
        }
      });
    } else {
      this.snackBar.open('Please enter a valid username or email', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar', 'warning-snackbar']
      });
    }
  }

  removeCollaborator(collaborator: string): void {
    if (confirm(`Remove ${collaborator} from this repository?`) && this.repository) {
      this.repositoryService.removeCollaborator(this.repository.fullName, collaborator).subscribe({
        next: () => {
          this.snackBar.open(`Removed ${collaborator} from repository`, 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar']
          });
          // Reload collaborators to get updated list
          this.loadRepositoryCollaborators();
        },
        error: (error: any) => {
          console.error('Error removing collaborator:', error);
          let errorMessage = 'Failed to remove collaborator';
          
          // Extract more specific error message if available
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'error-snackbar']
          });
        }
      });
    }
  }

  createCollaboratorBranch(username: string): void {
    if (!this.repository || !username) return;

    const branchName = username.toLowerCase().replace(/[^a-z0-9]/g, '-');

    this.repositoryService.createBranch(this.repository.fullName, branchName, this.selectedBranch).subscribe({
      next: () => {
        this.snackBar.open(`Branch "${branchName}" created for ${username}`, 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar']
        });
        // Reload branches to get updated list
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

        this.snackBar.open(errorMessage, 'Close', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar', 'error-snackbar']
        });
      }
    });
  }

  loadLatestCommit(): void {
    if (!this.repository) return;

    const [owner, repo] = this.repository.fullName.split('/');

    this.repositoryService.getLatestCommit(owner, repo, '', this.selectedBranch).subscribe({
      next: (commits: any) => {
        console.log('Latest commit response:', commits);
        if (commits && commits.length > 0) {
          const latestCommit = commits[0];
          console.log('Latest commit data:', latestCommit);
          console.log('Commit date:', latestCommit.commit.author.date);
          console.log('Current time:', new Date().toISOString());

          // Parse the commit date properly
          const commitDate = new Date(latestCommit.commit.author.date);
          const now = new Date();
          const diffInMs = now.getTime() - commitDate.getTime();
          const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

          console.log('Time difference in minutes:', diffInMinutes);

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

  // Collaborator management
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
    this.collaborator = user.email; // Use email for better UX
    this.userSuggestions = [];
    this.showUserSuggestions = false;
  }

  hideUserSuggestions(): void {
    // Add a small delay to allow click events on suggestions to fire
    setTimeout(() => {
      this.showUserSuggestions = false;
    }, 200);
  }

  // Branch management
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
          this.snackBar.open(`Branch "${this.newBranchName}" created successfully!`, 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar']
          });
          this.newBranchName = '';
          this.showCreateBranchInput = false;
          
          // Reload branches to get updated list
          this.loadRepositoryBranches();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.branchSuccessMessage = '';
          }, 3000);
        },
        error: (error: any) => {
          console.error('Error creating branch:', error);
          let errorMessage = 'Failed to create branch';
          
          // Extract more specific error message if available
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.branchErrorMessage = errorMessage;
          this.snackBar.open(errorMessage, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'error-snackbar']
          });
        }
      });
    } else {
      this.branchErrorMessage = 'Please enter a valid branch name';
      this.snackBar.open('Please enter a valid branch name', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar', 'warning-snackbar']
      });
    }
  }

  deleteBranch(branchName: string): void {
    if (confirm(`Delete branch "${branchName}"? This cannot be undone.`) && this.repository) {
      this.repositoryService.deleteBranch(this.repository.fullName, branchName).subscribe({
        next: () => {
          this.snackBar.open(`Branch "${branchName}" deleted successfully`, 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar']
          });
          // Reload branches to get updated list
          this.loadRepositoryBranches();
        },
        error: (error: any) => {
          console.error('Error deleting branch:', error);
          let errorMessage = 'Failed to delete branch';
          
          // Extract more specific error message if available
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar', 'error-snackbar']
          });
        }
      });
    }
  }

  filteredBranches(): string[] {
    console.log('filteredBranches called - repositoryBranches:', this.repositoryBranches);
    console.log('selectedBranch:', this.selectedBranch);
    console.log('branchSearch:', this.branchSearch);
    
    if (!this.repositoryBranches) return [];
    
    if (!this.branchSearch.trim()) {
      const filtered = this.repositoryBranches.filter(branch => branch !== this.selectedBranch);
      console.log('Filtered branches (no search):', filtered);
      return filtered;
    }
    
    const filtered = this.repositoryBranches.filter(branch => 
      branch !== this.selectedBranch && 
      branch.toLowerCase().includes(this.branchSearch.toLowerCase())
    );
    console.log('Filtered branches (with search):', filtered);
    return filtered;
  }

  // Repository deletion
  confirmDelete(): void {
    if (this.deleteInput === this.repoName && this.repository) {
      if (confirm('This will permanently delete the repository. Are you absolutely sure?')) {
        console.log('Starting repository deletion...');
        this.repositoryService.deleteRepository(this.repository.fullName).subscribe({
          next: () => {
            console.log('Repository deleted successfully, showing snackbar');
            const snackBarRef = this.snackBar.open(`Repository "${this.repoName}" deleted successfully`, 'Close', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: ['custom-snackbar']
            });
            console.log('Success snackbar ref:', snackBarRef);
            this.router.navigate(['/teacher/repositories']);
          },
          error: (error: any) => {
            console.error('Error deleting repository:', error);
            let errorMessage = 'Failed to delete repository';
            
            // Extract more specific error message if available
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
            
            console.log('Showing error snackbar with message:', errorMessage);
            const snackBarRef = this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: ['custom-snackbar', 'error-snackbar']
            });
            console.log('Error snackbar ref:', snackBarRef);
          }
        });
      }
    } else {
      console.log('Repository name mismatch, showing validation snackbar');
      const snackBarRef = this.snackBar.open('Repository name does not match. Please try again.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar', 'warning-snackbar']
      });
      console.log('Validation snackbar ref:', snackBarRef);
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
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
}
