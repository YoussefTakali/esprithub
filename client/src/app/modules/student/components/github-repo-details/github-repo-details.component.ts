import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { GitHubService } from '../../../../services/github.service';

@Component({
  selector: 'app-github-repo-details',
  templateUrl: './github-repo-details.component.html',
  styleUrls: ['./github-repo-details.component.css']
})
export class GitHubRepoDetailsComponent implements OnInit, OnDestroy {
  window = window; // Add window reference for template access
  repository: any = null;
  loading = true;
  error: string | null = null;
  selectedActivityPeriod = '30 days';
  activityPeriods = ['7 days', '30 days', '90 days'];
  activeTab = 'code';
  showCloneModal = false;
  showFileContent = false;
  showCommitDetails = false;
  showCommitHistory = false;
  selectedFile: any = null;
  selectedCommit: any = null;
  fileContent = '';
  currentPath: string[] = [];
  currentBranch: string = 'main';
  branchSwitching: boolean = false;

  // Timer for updating relative timestamps
  private timeUpdateInterval: any;

  // File view state (for main view, not modal)
  isViewingFile = false;
  currentViewingFile: any = null;

  // File editing state
  isEditingFile = false;
  editedFileContent = '';
  editCommitMessage = '';
  isSavingFile = false;

  // File replacement state
  isReplacingFile = false;
  showReplaceModal = false;
  selectedReplaceFile: File | null = null;
  replaceCommitMessage = '';

  // File deletion state
  isDeletingFile = false;
  showDeleteModal = false;
  deleteCommitMessage = '';
  
  // Dynamic GitHub data properties
  dashboardStats: any = {
    totalCommits: 0,
    contributors: 0,
    totalFiles: 0,
    repositorySize: '0 KB'
  };
  
  activityStats = {
    totalCommits: 0,
    linesAdded: 0,
    linesDeleted: 0
  };
  
  fileTypes: any[] = [];
  repositoryFiles: any[] = [];
  contributors: any[] = [];
  branches: any[] = [];
  commits: any[] = [];
  latestCommit: any = null;
  fileTree: any = {};

  // Upload functionality properties
  selectedUploadBranch: string = 'main';
  uploadCommitMessage: string = 'Add files via upload';
  isUploading = false;
  imageLoadError = false;
  showUploadModal = false;
  selectedFiles: File[] = [];

  // Repository description properties
  repositoryDescription: string = '';
  isEditingDescription: boolean = false;
  editingDescriptionText: string = '';
  readmeFile: any = null; // Store README file info for updates

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studentService: StudentService,
    private readonly githubService: GitHubService
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

    // Start timer to update relative timestamps every 30 seconds
    this.timeUpdateInterval = setInterval(() => {
      // This will trigger change detection and update the displayed times
      this.updateRelativeTimestamps();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  private updateRelativeTimestamps(): void {
    // Update the lastModified display for all files with their raw dates
    if (this.repositoryFiles) {
      this.repositoryFiles = this.repositoryFiles.map(file => ({
        ...file,
        lastModified: file.rawDate ? this.formatDate(file.rawDate) : file.lastModified
      }));
    }

    // Also update the latest commit timestamp
    if (this.latestCommit && this.latestCommit.rawDate) {
      this.latestCommit = {
        ...this.latestCommit,
        date: this.formatDate(this.latestCommit.rawDate)
      };
    }
  }

  loadRepositoryDetails(repoId: string): void {
    this.loading = true;
    this.error = null;

    // First get repository details to extract owner/repo information
    this.studentService.getRepositoryDetails(repoId).subscribe({
      next: (repoData: any) => {
        console.log('Repository details:', repoData);
        this.repository = repoData;
        this.currentBranch = repoData.defaultBranch ?? 'main';
        
        // Extract owner and repo name
        const owner = repoData.owner?.login ?? repoData.fullName?.split('/')[0];
        const repoName = repoData.name ?? repoData.fullName?.split('/')[1];
        
        if (owner && repoName) {
          this.loadDynamicRepositoryData(owner, repoName);
          this.loadRepositoryDescription(owner, repoName);
        } else {
          this.error = 'Unable to determine repository owner and name';
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading repository details:', error);
        this.error = 'Failed to load repository details. Please try again.';
        this.loading = false;
      }
    });
  }

  private loadDynamicRepositoryData(owner: string, repo: string): void {
    // Load comprehensive repository overview
    this.studentService.getRepositoryOverview(owner, repo, this.currentBranch).subscribe({
      next: (overview: any) => {
        console.log('Repository overview:', overview);
        this.processDynamicData(overview);
        this.loadAdditionalData(owner, repo);
      },
      error: (error) => {
        console.error('Error loading repository overview:', error);
        // Fallback to individual API calls
        this.loadDataSeparately(owner, repo);
      }
    });
  }

  private loadAdditionalData(owner: string, repo: string): void {
    // Load commits with pagination - only load when needed
    this.loadCommitsData(owner, repo);

    // Load contributors
    this.studentService.getRepositoryContributors(owner, repo).subscribe({
      next: (contributors: any[]) => {
        this.contributors = contributors.map(c => ({
          name: c.login,
          commits: c.contributions,
          avatar: c.avatarUrl,
          url: c.htmlUrl
        }));
      },
      error: (error) => console.error('Error loading contributors:', error)
    });

    // Load branches
    this.studentService.getRepositoryBranches(owner, repo).subscribe({
      next: (branches: any[]) => {
        this.branches = branches;
      },
      error: (error) => console.error('Error loading branches:', error)
    });

    this.loading = false;
  }

  private loadDataSeparately(owner: string, repo: string): void {
    // Fallback method if overview API fails
    this.studentService.getRepositoryFiles(owner, repo, '', this.currentBranch).subscribe({
      next: (files: any[]) => {
        this.repositoryFiles = this.processFileData(files);
        this.loadAdditionalData(owner, repo);
      },
      error: (error) => {
        console.error('Error loading repository files:', error);
        this.error = 'Failed to load repository data';
        this.loading = false;
      }
    });
  }

  private processDynamicData(data: any): void {
    // Update dashboard stats with real GitHub data
    this.dashboardStats = {
      totalCommits: data.recentCommits?.length ?? 0,
      contributors: data.contributors?.length ?? 0,
      totalFiles: data.rootFiles?.length ?? 0,
      repositorySize: this.formatRepositorySize(data.stats?.size ?? 0)
    };

    // Process repository files from rootFiles and fileTree
    if (data.rootFiles) {
      this.repositoryFiles = this.processFileData(data.rootFiles);
    }

    // Process file tree for navigation
    if (data.fileTree) {
      this.fileTree = data.fileTree;
    }

    // Process latest commit
    if (data.recentCommits && data.recentCommits.length > 0) {
      const latestCommit = data.recentCommits[0];
      const rawDate = latestCommit.date ?? latestCommit.authorDate ?? latestCommit.committerDate;
      this.latestCommit = {
        message: latestCommit.message,
        author: latestCommit.authorName ?? latestCommit.author ?? latestCommit.githubAuthorLogin,
        date: this.formatDate(rawDate),
        rawDate: rawDate,
        sha: latestCommit.sha?.substring(0, 7) ?? 'unknown',
        url: latestCommit.htmlUrl,
        avatarUrl: latestCommit.githubAuthorAvatarUrl ?? latestCommit.authorAvatarUrl
      };
    }

    // Process languages for file types
    if (data.languages) {
      this.processLanguages(data.languages);
    }

    // Update activity stats
    this.activityStats = {
      totalCommits: data.recentCommits?.length ?? 0,
      linesAdded: 0, // This would need to be calculated from commit data
      linesDeleted: 0 // This would need to be calculated from commit data
    };
  }

  private processFileData(files: any[]): any[] {
    return files.map((file: any) => {
      // Get the most accurate date from available sources
      const dateValue = file.lastModified || file.lastCommitDate || file.date || file.authorDate || file.committerDate;

      return {
        name: file.name,
        type: file.type === 'dir' ? 'folder' : 'file',
        size: file.sizeFormatted ?? this.formatFileSize(file.size ?? 0),
        lastModified: dateValue ? this.formatDate(dateValue) : this.getFileLastCommitDate(file),
        rawDate: dateValue, // Store raw date for timestamp updates
        message: file.lastCommitMessage ?? file.message ?? this.getFileLastCommitMessage(file),
        committer: file.lastCommitAuthor ?? file.committer ?? this.getFileLastCommitter(file),
        committerAvatar: file.lastCommitAuthorAvatar ?? file.committerAvatar ?? this.getFileLastCommitterAvatar(file),
        path: file.path,
        downloadUrl: file.downloadUrl,
        htmlUrl: file.htmlUrl,
        sha: file.sha,
        category: file.category,
        extension: file.extension,
        capabilities: file.capabilities
      };
    });
  }


  // Public methods for template access
  public getDefaultCommitter(): string {
    return this.repository?.owner?.login ||
           this.repository?.fullName?.split('/')[0] ||
           'unknown';
  }

  public getDefaultCommitterAvatar(): string {
    const committer = this.getDefaultCommitter();
    return this.repository?.owner?.avatar_url ||
           `https://github.com/${committer}.png`;
  }

  public getRelativeTime(date: Date | string): string {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffInMs = now.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffInMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return diffSeconds <= 5 ? 'now' : `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  public getTotalCommits(): number {
    return this.commits?.length || this.activityStats?.totalCommits || 0;
  }

  public getAllBranches(): any[] {
    const allBranches = [];

    // Add default branch first
    const defaultBranch = this.repository?.defaultBranch || 'main';
    allBranches.push({ name: defaultBranch });

    // Add other branches from API, but avoid duplicates
    if (this.branches && this.branches.length > 0) {
      this.branches.forEach(branch => {
        const branchName = branch.name || branch;
        if (branchName !== defaultBranch) {
          allBranches.push({ name: branchName });
        }
      });
    }

    return allBranches;
  }

  public onCommitAvatarError(event: any): void {
    const author = this.latestCommit?.author || this.getDefaultCommitter();
    event.target.src = `https://github.com/identicons/${author}.png`;
  }

  public onFileCommitterAvatarError(event: any, committer: string): void {
    event.target.src = `https://github.com/identicons/${committer}.png`;
  }

  public onContributorAvatarError(event: any, contributorName: string): void {
    event.target.src = `https://github.com/identicons/${contributorName}.png`;
  }

  public onDefaultContributorAvatarError(event: any): void {
    const committer = this.getDefaultCommitter();
    event.target.src = `https://github.com/identicons/${committer}.png`;
  }

  private getFileLastCommitDate(file: any): string {
    // Try to find the last commit that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(commit =>
        commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path)
      );
      if (fileCommit) {
        return this.formatDate(fileCommit.rawDate || fileCommit.date);
      }
    }

    // Fallback to latest commit date if available
    if (this.latestCommit && this.latestCommit.date) {
      return this.latestCommit.date;
    }

    return 'Unknown';
  }

  private getFileLastCommitMessage(file: any): string {
    // Try to find the last commit message that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(commit =>
        commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path)
      );
      if (fileCommit) {
        return fileCommit.message;
      }
    }

    // Fallback to latest commit message if available
    if (this.latestCommit && this.latestCommit.message) {
      return this.latestCommit.message;
    }

    return 'Initial commit';
  }

  private getFileLastCommitter(file: any): string {
    // Try to find the last committer that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(commit =>
        commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path)
      );
      if (fileCommit) {
        return fileCommit.author;
      }
    }

    // Fallback to latest commit author if available
    if (this.latestCommit && this.latestCommit.author) {
      return this.latestCommit.author;
    }

    return this.getDefaultCommitter();
  }

  private getFileLastCommitterAvatar(file: any): string {
    // Try to find the last committer avatar that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(commit =>
        commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path)
      );
      if (fileCommit) {
        return fileCommit.avatarUrl;
      }
    }

    // Fallback to latest commit avatar if available
    if (this.latestCommit && this.latestCommit.avatarUrl) {
      return this.latestCommit.avatarUrl;
    }

    return this.getDefaultCommitterAvatar();
  }

  // Repository description methods
  private loadRepositoryDescription(owner: string, repo: string): void {
    // Try to load README.md file
    this.studentService.getFileContent(owner, repo, 'README.md', this.currentBranch).subscribe({
      next: (readmeContent: any) => {
        this.readmeFile = readmeContent;
        // Properly decode the base64 content
        try {
          const decodedContent = this.decodeBase64Content(readmeContent.content);
          // Only use the content if it's meaningful (not just default GitHub content)
          if (decodedContent && decodedContent.trim() &&
              !decodedContent.includes('# ') &&
              decodedContent.length > 10) {
            this.repositoryDescription = decodedContent.trim();
          } else {
            this.repositoryDescription = '';
          }
        } catch (error) {
          console.error('Error decoding README content:', error);
          this.repositoryDescription = '';
        }
        console.log('Loaded repository description from README.md:', this.repositoryDescription);
      },
      error: (error) => {
        console.log('No README.md found or error loading it:', error);
        this.repositoryDescription = '';
        this.readmeFile = null;
      }
    });
  }

  public toggleDescriptionEdit(): void {
    this.isEditingDescription = !this.isEditingDescription;
    if (this.isEditingDescription) {
      this.editingDescriptionText = this.repositoryDescription;
    }
  }

  public saveDescription(): void {
    const description = this.editingDescriptionText.trim();
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (!owner || !repoName) {
      console.error('Unable to determine repository owner and name');
      return;
    }

    // Save description to README.md file
    this.saveDescriptionToReadme(owner, repoName, description);
  }

  private saveDescriptionToReadme(owner: string, repo: string, description: string): void {
    const commitMessage = 'Update repository description';

    // Add some basic formatting to make it a proper README
    const readmeContent = description.trim() ? description.trim() : 'No description provided.';

    if (this.readmeFile && this.readmeFile.sha) {
      // Update existing README.md
      console.log('Updating existing README.md with SHA:', this.readmeFile.sha);
      this.studentService.updateFile(
        owner,
        repo,
        'README.md',
        readmeContent,
        commitMessage,
        this.readmeFile.sha,
        this.currentBranch
      ).subscribe({
        next: (result: any) => {
          console.log('README.md updated successfully:', result);
          this.repositoryDescription = description;
          this.isEditingDescription = false;
          // Update the readmeFile with new SHA from the response
          if (result.content && result.content.sha) {
            this.readmeFile.sha = result.content.sha;
          }
          alert('Repository description updated successfully!');

          // Refresh the repository data to show the updated README
          this.refreshFileList();
        },
        error: (error) => {
          console.error('Error updating README.md:', error);
          console.error('Error details:', error.error);
          alert('Failed to update repository description. Please try again.');
        }
      });
    } else {
      // Create new README.md
      console.log('Creating new README.md file');
      this.studentService.createFile(
        owner,
        repo,
        'README.md',
        readmeContent,
        commitMessage,
        this.currentBranch
      ).subscribe({
        next: (result: any) => {
          console.log('README.md created successfully:', result);
          this.repositoryDescription = description;
          this.isEditingDescription = false;
          // Store the new file info for future updates
          this.readmeFile = result.content || result;
          alert('Repository description created successfully!');

          // Refresh the repository data to show the new README
          this.refreshFileList();
        },
        error: (error) => {
          console.error('Error creating README.md:', error);
          console.error('Error details:', error.error);
          alert('Failed to create repository description. Please try again.');
        }
      });
    }
  }

  public cancelDescriptionEdit(): void {
    this.isEditingDescription = false;
    this.editingDescriptionText = '';
  }



  private processCommitData(commits: any[]): void {
    // Update commits array and extract latest commit if not already set
    this.commits = commits.map(commit => {
      const rawDate = commit.date ?? commit.authorDate ?? commit.committerDate;

      return {
        sha: commit.sha,
        shortSha: commit.sha?.substring(0, 7) ?? 'unknown',
        message: commit.message,
        author: commit.authorName ?? commit.author ?? commit.githubAuthorLogin,
        authorEmail: commit.authorEmail,
        date: this.formatDate(rawDate),
        rawDate: rawDate,
        url: commit.htmlUrl,
        avatarUrl: commit.githubAuthorAvatarUrl,
        files: commit.files || []
      };
    });

    // Set latest commit if not already set
    if (!this.latestCommit && commits.length > 0) {
      const latest = this.commits[0];
      this.latestCommit = latest;
    }
  }

  formatRepositorySize(sizeInKB: number): string {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`;
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(1)} MB`;
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`;
    }
  }

  formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Unknown';
    }

    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return diffSeconds <= 5 ? 'now' : `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  private processLanguages(languages: { [key: string]: number }): void {
    const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
    
    if (total === 0) {
      this.fileTypes = [];
      return;
    }

    // Define colors for common languages
    const languageColors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#3178c6',
      'Python': '#3776ab',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C': '#555555',
      'HTML': '#e34c26',
      'CSS': '#1572b6',
      'PHP': '#4f5d95',
      'Ruby': '#701516',
      'Go': '#00add8',
      'Rust': '#dea584',
      'Swift': '#fa7343',
      'Kotlin': '#a97bff',
      'Dart': '#00b4ab',
      'C#': '#239120',
      'Shell': '#89e051',
      'PowerShell': '#012456',
      'Dockerfile': '#384d54',
      'JSON': '#292929',
      'YAML': '#cb171e',
      'Markdown': '#083fa1'
    };

    this.fileTypes = Object.entries(languages)
      .map(([language, bytes]) => ({
        type: language.toLowerCase(),
        name: language,
        percentage: Math.round((bytes / total) * 100),
        color: languageColors[language] ?? '#6c757d',
        size: this.formatFileSize(bytes)
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10); // Show top 10 languages
  }

  // Navigation and UI methods
  goBack(): void {
    this.router.navigate(['/student/repositories']);
  }

  onActivityPeriodChange(period: string): void {
    this.selectedActivityPeriod = period;
    // Here you would typically reload activity data for the selected period
  }

  refreshData(): void {
    if (this.repository) {
      this.loadRepositoryDetails(this.repository.id);
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleCloneModal(): void {
    this.showCloneModal = !this.showCloneModal;
  }

  closeCloneModal(): void {
    this.showCloneModal = false;
  }

  openCloneModal(): void {
    this.showCloneModal = true;
  }

  // Removed openCommitDetails - only use "View Commit History" button

  closeCommitDetails(): void {
    this.showCommitDetails = false;
    this.selectedCommit = null;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
      // You could show a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  downloadZip(): void {
    if (this.repository) {
      const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
      const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];
      
      if (owner && repoName) {
        // Use GitHub's download ZIP URL
        const downloadUrl = `https://github.com/${owner}/${repoName}/archive/${this.currentBranch}.zip`;
        window.open(downloadUrl, '_blank');
      }
    }
  }

  getFileIcon(type: string): string {
    return type === 'folder' ? 'fas fa-folder' : 'fas fa-file';
  }

  getFileIconColor(fileName: string, type: string): string {
    if (type === 'folder') return '#79b8ff';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    const colors: { [key: string]: string } = {
      'md': '#083fa1',
      'json': '#f1e05a',
      'html': '#e34c26',
      'css': '#563d7c',
      'js': '#f1e05a',
      'ts': '#2b7489',
      'py': '#3572a5',
      'txt': '#6c757d',
      'jpg': '#f39c12',
      'png': '#f39c12',
      'gitignore': '#6c757d',
      'gitattributes': '#6c757d',
      'csv': '#2b7489'
    };
    return colors[extension ?? ''] ?? '#6c757d';
  }

  // File operations
  onFileClick(file: any): void {
    if (file.type === 'folder') {
      this.navigateToFolder(file.path);
    } else {
      this.openFileContent(file);
    }
  }

  navigateToFolder(path: string): void {
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];
    
    if (owner && repoName) {
      this.studentService.getRepositoryFiles(owner, repoName, path, this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files);
          this.currentPath = path.split('/').filter(p => p.length > 0);
        },
        error: (error) => {
          console.error('Error loading folder contents:', error);
        }
      });
    }
  }

  openFileContent(file: any): void {
    this.resetImageError(); // Reset image error state
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      // For images and binary files, we don't need to fetch the content
      if (this.isBinaryFile(file.name)) {
        this.currentViewingFile = file;
        this.fileContent = '';
        this.isViewingFile = true;
        return;
      }

      // For text files, fetch the content
      this.studentService.getFileContent(owner, repoName, file.path, this.currentBranch).subscribe({
        next: (content: any) => {
          this.currentViewingFile = { ...file, ...content };
          this.fileContent = this.decodeBase64Content(content.content);
          this.isViewingFile = true;
        },
        error: (error) => {
          console.error('Error loading file content:', error);
        }
      });
    }
  }

  decodeBase64Content(base64Content: string): string {
    try {
      return atob(base64Content);
    } catch (error) {
      console.error('Error decoding base64 content:', error);
      return 'Unable to decode file content';
    }
  }

  // Check if file is an image
  isImageFile(fileName: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension ?? '');
  }

  // Check if file is binary
  isBinaryFile(fileName: string): boolean {
    const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'pdf', 'zip', 'rar', 'exe', 'dll', 'so', 'dylib'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return binaryExtensions.includes(extension ?? '');
  }

  // Get image source for display
  getImageSrc(file: any): string {
    if (file.downloadUrl) {
      return file.downloadUrl;
    }
    // Fallback to constructing GitHub raw URL
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];
    return `https://raw.githubusercontent.com/${owner}/${repoName}/${this.currentBranch}/${file.path}`;
  }

  closeFileView(): void {
    this.showFileContent = false;
    this.selectedFile = null;
    this.fileContent = '';
    this.resetImageError();
  }

  // Back to file list from file view
  backToFiles(): void {
    this.isViewingFile = false;
    this.currentViewingFile = null;
    this.fileContent = '';
    this.isEditingFile = false;
    this.editedFileContent = '';
    this.editCommitMessage = '';
    this.resetImageError();
  }

  // File editing methods
  startEditingFile(): void {
    if (this.currentViewingFile && !this.isBinaryFile(this.currentViewingFile.name)) {
      this.isEditingFile = true;
      this.editedFileContent = this.fileContent;
      this.editCommitMessage = `Update ${this.currentViewingFile.name}`;
    }
  }

  cancelEditing(): void {
    this.isEditingFile = false;
    this.editedFileContent = '';
    this.editCommitMessage = '';
  }

  saveFileChanges(): void {
    if (!this.currentViewingFile || !this.editCommitMessage.trim()) {
      alert('Please provide a commit message');
      return;
    }

    this.isSavingFile = true;
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      this.studentService.updateFile(
        owner,
        repoName,
        this.currentViewingFile.path,
        this.editedFileContent,
        this.editCommitMessage,
        this.currentViewingFile.sha,
        this.currentBranch
      ).subscribe({
        next: (result: any) => {
          console.log('File updated successfully:', result);

          // Update the local file content
          this.fileContent = this.editedFileContent;
          this.currentViewingFile.sha = result.content?.sha || this.currentViewingFile.sha;

          // Exit edit mode
          this.isEditingFile = false;
          this.editedFileContent = '';
          this.editCommitMessage = '';
          this.isSavingFile = false;

          // Refresh the file list to show updated commit info
          this.refreshFileList();

          alert('File updated successfully!');
        },
        error: (error: any) => {
          console.error('Error updating file:', error);
          this.isSavingFile = false;
          alert('Failed to update file. Please try again.');
        }
      });
    }
  }

  // File replacement methods
  openReplaceModal(): void {
    if (this.currentViewingFile) {
      this.showReplaceModal = true;
      this.selectedReplaceFile = null;
      this.replaceCommitMessage = `Replace ${this.currentViewingFile.name}`;
    }
  }

  closeReplaceModal(): void {
    this.showReplaceModal = false;
    this.selectedReplaceFile = null;
    this.replaceCommitMessage = '';
  }

  onReplaceFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedReplaceFile = files[0];
      console.log('Replace file selected:', this.selectedReplaceFile?.name);
    }
  }

  replaceFile(): void {
    if (!this.selectedReplaceFile || !this.replaceCommitMessage.trim()) {
      alert('Please select a file and provide a commit message');
      return;
    }

    if (!this.currentViewingFile) {
      alert('No file selected for replacement');
      return;
    }

    this.isReplacingFile = true;
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      // Use uploadFile method which handles file replacement properly
      this.studentService.uploadFile(
        owner,
        repoName,
        this.selectedReplaceFile,
        this.currentViewingFile.path,
        this.replaceCommitMessage,
        this.currentBranch
      ).subscribe({
        next: (result: any) => {
          console.log('File replaced successfully:', result);

          // Update the local file content if it's a text file
          if (!this.isBinaryFile(this.selectedReplaceFile!.name)) {
            // Read the file content to update the view
            const reader = new FileReader();
            reader.onload = () => {
              this.fileContent = reader.result as string;
            };
            reader.readAsText(this.selectedReplaceFile!);
          }

          // Update file info
          this.currentViewingFile.sha = result.content?.sha || this.currentViewingFile.sha;
          this.currentViewingFile.name = this.selectedReplaceFile!.name;

          // Close modal and reset state
          this.closeReplaceModal();
          this.isReplacingFile = false;

          // Refresh the file list
          this.refreshFileList();

          alert('File replaced successfully!');
        },
        error: (error: any) => {
          console.error('Error replacing file:', error);
          console.error('Full error details:', JSON.stringify(error, null, 2));
          this.isReplacingFile = false;

          let errorMessage = 'Failed to replace file. Please try again.';
          if (error.error?.message) {
            errorMessage = `Failed to replace file: ${error.error.message}`;
          } else if (error.message) {
            errorMessage = `Failed to replace file: ${error.message}`;
          }

          alert(errorMessage);
        }
      });
    }
  }

  // File deletion methods
  openDeleteModal(): void {
    if (this.currentViewingFile) {
      this.showDeleteModal = true;
      this.deleteCommitMessage = `Delete ${this.currentViewingFile.name}`;
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteCommitMessage = '';
  }

  deleteFile(): void {
    if (!this.deleteCommitMessage.trim()) {
      alert('Please provide a commit message');
      return;
    }

    if (!this.currentViewingFile) {
      alert('No file selected for deletion');
      return;
    }

    this.isDeletingFile = true;
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      this.studentService.deleteFile(
        owner,
        repoName,
        this.currentViewingFile.path,
        this.deleteCommitMessage,
        this.currentViewingFile.sha,
        this.currentBranch
      ).subscribe({
        next: (result: any) => {
          console.log('File deleted successfully:', result);

          // Close modal and reset state
          this.closeDeleteModal();
          this.isDeletingFile = false;

          // Go back to file list since the file no longer exists
          this.backToFiles();

          // Refresh the file list
          this.refreshFileList();

          alert('File deleted successfully!');
        },
        error: (error: any) => {
          console.error('Error deleting file:', error);
          console.error('Full error details:', JSON.stringify(error, null, 2));
          this.isDeletingFile = false;

          let errorMessage = 'Failed to delete file. Please try again.';
          if (error.error?.message) {
            errorMessage = `Failed to delete file: ${error.error.message}`;
          } else if (error.message) {
            errorMessage = `Failed to delete file: ${error.message}`;
          }

          alert(errorMessage);
        }
      });
    }
  }

  // Refresh file list after changes
  private refreshFileList(): void {
    if (!this.repository) return;

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      const currentPath = this.currentPath.join('/');
      this.studentService.getRepositoryFiles(owner, repoName, currentPath, this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files);
          console.log('File list refreshed successfully');
        },
        error: (error: any) => {
          console.error('Error refreshing file list:', error);
        }
      });
    }
  }

  navigateToPath(index: number): void {
    const newPath = this.currentPath.slice(0, index + 1).join('/');
    this.navigateToFolder(newPath);
  }

  navigateToRoot(): void {
    this.currentPath = [];
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      this.studentService.getRepositoryFiles(owner, repoName, '', this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files);
        },
        error: (error) => {
          console.error('Error loading root files:', error);
        }
      });
    }
  }

  navigateToRootWithCallback(callback: () => void): void {
    this.currentPath = [];
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      this.studentService.getRepositoryFiles(owner, repoName, '', this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files);
          callback(); // Call the callback when done
        },
        error: (error) => {
          console.error('Error loading root files:', error);
          callback(); // Call callback even on error
        }
      });
    } else {
      callback(); // Call callback if no owner/repo
    }
  }

  // Branch operations
  switchBranch(branchName: string): void {
    if (this.currentBranch === branchName) {
      return; // No need to switch if already on this branch
    }

    this.branchSwitching = true;
    this.currentBranch = branchName;
    this.selectedUploadBranch = branchName; // Keep upload branch in sync

    // Only reload files if we're at the root level, otherwise just update the branch
    if (this.currentPath.length === 0) {
      this.navigateToRootWithCallback(() => {
        this.branchSwitching = false;
      });
    } else {
      // If we're in a subfolder, navigate back to root for the new branch
      this.currentPath = [];
      this.navigateToRootWithCallback(() => {
        this.branchSwitching = false;
      });
    }
  }

  // Commit operations - ONLY way to view commit history
  showCommitHistoryView(): void {
    if (!this.repository) return;

    // Extract owner name properly based on backend structure
    console.log('Repository object:', this.repository);
    console.log('Repository.owner:', this.repository.owner);
    console.log('Repository.ownerName:', this.repository.ownerName);
    console.log('Repository.fullName:', this.repository.fullName);

    let owner = null;

    // Based on backend code analysis, try these approaches in order:
    if (this.repository.owner && typeof this.repository.owner === 'object' && this.repository.owner.login) {
      // GitHub data available: owner is an object with login property
      owner = this.repository.owner.login;
      console.log('Using owner.login:', owner);
    } else if (this.repository.ownerName && typeof this.repository.ownerName === 'string') {
      // Database-only data: ownerName is a string
      owner = this.repository.ownerName;
      console.log('Using ownerName:', owner);
    } else if (this.repository.fullName && typeof this.repository.fullName === 'string') {
      // Fallback: extract from fullName (owner/repo format)
      owner = this.repository.fullName.split('/')[0];
      console.log('Using fullName split:', owner);
    } else if (typeof this.repository.owner === 'string') {
      // Edge case: owner is directly a string
      owner = this.repository.owner;
      console.log('Using owner as string:', owner);
    }

    const repo = this.repository.name;

    console.log('Extracted owner:', owner, 'type:', typeof owner);
    console.log('Extracted repo:', repo, 'type:', typeof repo);

    // Validate that owner and repo are strings, not objects
    if (typeof owner !== 'string' || typeof repo !== 'string') {
      console.error('Owner or repo is not a string:', { owner: typeof owner, repo: typeof repo });
      alert('Error: Unable to determine repository owner and name. Please refresh the page.');
      return;
    }

    if (owner && repo) {
      console.log('Navigating with params:', { owner, repo, branch: this.currentBranch });
      // Navigate to a new page for commit history
      this.router.navigate(['/student/repositories', this.repository.id, 'commits'], {
        queryParams: { owner, repo, branch: this.currentBranch }
      });
    } else {
      console.error('Missing owner or repo for navigation:', { owner, repo });
      alert('Error: Missing repository information. Please refresh the page.');
    }
  }

  private loadCommitHistoryData(): void {
    if (!this.repository) return;

    const owner = this.repository.owner || this.repository.ownerName;
    const repo = this.repository.name;

    if (!owner || !repo) {
      console.error('Missing owner or repo name for loading commits');
      return;
    }

    // Load all commits for history view
    this.studentService.getRepositoryCommits(owner, repo, this.currentBranch, 1, 100).subscribe({
      next: (commits: any[]) => {
        this.commits = commits;
        this.processCommitData(commits);
        this.showCommitHistory = true;
      },
      error: (error) => {
        console.error('Error loading commit history:', error);
        this.commits = [];
        this.showCommitHistory = true;
      }
    });
  }

  private loadCommitsData(owner: string, repo: string): void {
    // Only load basic commit data for latest commit display
    this.studentService.getRepositoryCommits(owner, repo, this.currentBranch, 1, 5).subscribe({
      next: (commits: any[]) => {
        this.processCommitData(commits);
      },
      error: (error) => console.error('Error loading commits:', error)
    });
  }

  closeCommitHistory(): void {
    this.showCommitHistory = false;
  }

  selectCommitFromHistory(commit: any): void {
    // Load detailed commit information with diff data
    this.loadCommitDetails(commit);
  }

  private loadCommitDetails(commit: any): void {
    if (!this.repository) return;

    const owner = this.repository.owner || this.repository.ownerName;
    const repo = this.repository.name;

    if (!owner || !repo || !commit.sha) {
      console.error('Missing required data for loading commit details');
      return;
    }

    // Fetch detailed commit information with diff data from GitHub API
    this.studentService.getCommitDetails(owner, repo, commit.sha).subscribe({
      next: (commitDetails: any) => {
        this.selectedCommit = {
          ...commit,
          ...commitDetails,
          shortSha: commitDetails.sha?.substring(0, 7) || commit.shortSha,
          author: commitDetails.githubAuthorLogin || commitDetails.authorName || commit.author,
          files: commitDetails.files || []
        };

        this.showCommitHistory = false;
        this.showCommitDetails = true;
      },
      error: (error) => {
        console.error('Error loading commit details:', error);
        // Fallback to basic commit data
        this.selectedCommit = {
          ...commit,
          shortSha: commit.sha?.substring(0, 7) || commit.shortSha,
          files: []
        };

        this.showCommitHistory = false;
        this.showCommitDetails = true;
      }
    });
  }



  backToCommitHistory(): void {
    this.showCommitDetails = false;
    this.selectedCommit = null;
    this.showCommitHistory = true;
  }

  getCommitsByDate(): any[] {
    if (!this.commits || this.commits.length === 0) {
      return [];
    }

    const groupedCommits: { [key: string]: any[] } = {};

    this.commits.forEach(commit => {
      const date = this.formatCommitDate(commit.rawDate);
      if (!groupedCommits[date]) {
        groupedCommits[date] = [];
      }
      groupedCommits[date].push(commit);
    });

    return Object.keys(groupedCommits)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date: date,
        commits: groupedCommits[date]
      }));
  }

  formatCommitDate(dateString: string): string {
    if (!dateString) return 'Unknown date';

    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  toggleFileDiff(change: any): void {
    change.expanded = !change.expanded;
  }

  parseDiffLines(diff: string): any[] {
    if (!diff) return [];

    const lines = diff.split('\n');
    const parsedLines: any[] = [];
    let oldLineNumber = 1;
    let newLineNumber = 1;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse hunk header to get line numbers
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNumber = parseInt(match[1]);
          newLineNumber = parseInt(match[2]);
        }
        parsedLines.push({
          type: 'hunk',
          content: line,
          oldLineNumber: null,
          newLineNumber: null
        });
      } else if (line.startsWith('+')) {
        parsedLines.push({
          type: 'addition',
          content: line.substring(1),
          oldLineNumber: null,
          newLineNumber: newLineNumber++
        });
      } else if (line.startsWith('-')) {
        parsedLines.push({
          type: 'deletion',
          content: line.substring(1),
          oldLineNumber: oldLineNumber++,
          newLineNumber: null
        });
      } else if (line.startsWith(' ') || line === '') {
        parsedLines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++
        });
      }
    }

    return parsedLines;
  }

  getDiffLineClass(line: any): string {
    switch (line.type) {
      case 'addition':
        return 'diff-addition';
      case 'deletion':
        return 'diff-deletion';
      case 'hunk':
        return 'diff-hunk';
      default:
        return 'diff-context';
    }
  }

  getDiffMarker(line: any): string {
    switch (line.type) {
      case 'addition':
        return '+';
      case 'deletion':
        return '-';
      case 'hunk':
        return '';
      default:
        return ' ';
    }
  }

  getAdditionsPercentage(): number {
    const details = this.getCommitDetails();
    const total = details.stats.additions + details.stats.deletions;
    return total > 0 ? (details.stats.additions / total) * 100 : 0;
  }

  getDeletionsPercentage(): number {
    const details = this.getCommitDetails();
    const total = details.stats.additions + details.stats.deletions;
    return total > 0 ? (details.stats.deletions / total) * 100 : 0;
  }

  getCommitDetails() {
    if (!this.selectedCommit) {
      return {
        sha: 'unknown',
        message: 'No commit selected',
        author: 'Unknown',
        date: 'Unknown',
        changes: [],
        stats: {
          additions: 0,
          deletions: 0,
          changedFiles: 0
        }
      };
    }

    // Use real commit data from GitHub API
    const files = this.selectedCommit.files || [];
    const changes = files.map((file: any) => ({
      file: file.filename || file.name || 'Unknown file',
      type: file.status || 'modified',
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      isBinary: file.binary || false,
      expanded: false,
      diff: file.patch || 'No diff available'
    }));

    const totalAdditions = files.reduce((sum: number, file: any) => sum + (file.additions || 0), 0);
    const totalDeletions = files.reduce((sum: number, file: any) => sum + (file.deletions || 0), 0);

    return {
      sha: this.selectedCommit.shortSha || this.selectedCommit.sha?.substring(0, 7) || 'unknown',
      message: this.selectedCommit.message || 'No commit message',
      author: this.selectedCommit.author || this.selectedCommit.authorName || 'Unknown',
      date: this.selectedCommit.date || 'Unknown date',
      changes: changes,
      stats: {
        additions: totalAdditions,
        deletions: totalDeletions,
        changedFiles: files.length
      }
    };
  }

  // Simple File Upload functionality

  // Upload Modal functionality

  openUploadModal(): void {
    this.showUploadModal = true;
    this.selectedUploadBranch = this.currentBranch; // Use the currently selected branch
    this.uploadCommitMessage = 'Add files via upload';
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    // Don't clear selectedFiles here - we need them for upload
  }

  onFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
      console.log('Files selected:', this.selectedFiles.length);

      // After files are selected, open the modal to set commit message
      this.selectedUploadBranch = this.currentBranch; // Use the currently selected branch
      this.uploadCommitMessage = 'Add files via upload';
      this.showUploadModal = true;
    }
  }

  onModalFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
      console.log('Files selected from modal:', this.selectedFiles.length);

      // Set default commit message and branch
      this.selectedUploadBranch = this.currentBranch;
      this.uploadCommitMessage = 'Add files via upload';
    }
  }

  uploadSelectedFiles(): void {
    console.log('uploadSelectedFiles called');
    console.log('selectedFiles length:', this.selectedFiles.length);
    console.log('selectedFiles:', this.selectedFiles);

    if (this.selectedFiles.length === 0) {
      console.error('No files selected when trying to upload');
      alert('Please select files to upload');
      return;
    }

    console.log('Proceeding with upload of', this.selectedFiles.length, 'files');
    this.closeUploadModal();

    // Store files in a local variable before clearing
    const filesToUpload = [...this.selectedFiles];
    this.selectedFiles = []; // Clear the array now

    this.handleFileUpload(filesToUpload);
  }



  // File download methods
  getFileDownloadUrl(file: any): string {
    if (!file || !this.repository) return '';

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName && file.path) {
      return `https://raw.githubusercontent.com/${owner}/${repoName}/${this.currentBranch}/${file.path}`;
    }
    return '';
  }

  downloadFile(file: any): void {
    if (!file) return;

    const downloadUrl = this.getFileDownloadUrl(file);
    if (downloadUrl) {
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private handleFileUpload(files: File[]): void {
    if (!this.repository) {
      console.error('No repository selected');
      return;
    }

    // Validate files
    if (!files || files.length === 0) {
      console.error('No files provided for upload');
      alert('Please select files to upload');
      return;
    }

    // Check for empty files
    const emptyFiles = files.filter(file => file.size === 0);
    if (emptyFiles.length > 0) {
      console.error('Empty files detected:', emptyFiles.map(f => f.name));
      alert('Cannot upload empty files: ' + emptyFiles.map(f => f.name).join(', '));
      return;
    }

    // Check file size limits (GitHub has a 100MB limit)
    const largeFiles = files.filter(file => file.size > 100 * 1024 * 1024);
    if (largeFiles.length > 0) {
      console.error('Files too large:', largeFiles.map(f => `${f.name} (${f.size} bytes)`));
      alert('Files too large (max 100MB): ' + largeFiles.map(f => f.name).join(', '));
      return;
    }

    // Get owner and repo name from repository data (loaded via ID)
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    console.log('Repository data for upload:', {
      repository: this.repository,
      owner: owner,
      repoName: repoName,
      fullName: this.repository.fullName,
      ownerLogin: this.repository.owner?.login,
      name: this.repository.name,
      routeId: this.route.snapshot.paramMap.get('id')
    });

    if (!owner || !repoName) {
      console.error('Unable to determine repository owner and name from repository data');
      console.error('Repository object:', this.repository);
      return;
    }

    this.isUploading = true;

    // Get current path for upload
    const basePath = this.currentPath.join('/');

    // Ensure branch is set correctly
    if (!this.selectedUploadBranch || this.selectedUploadBranch.trim() === '') {
      this.selectedUploadBranch = this.repository?.defaultBranch || 'main';
      console.warn('Upload branch was empty, defaulting to:', this.selectedUploadBranch);
    }

    console.log('Upload parameters:', {
      owner,
      repoName,
      basePath,
      uploadCommitMessage: this.uploadCommitMessage,
      selectedUploadBranch: this.selectedUploadBranch,
      filesCount: files.length,
      repositoryDefaultBranch: this.repository?.defaultBranch,
      currentBranch: this.currentBranch
    });

    // Force single file upload for debugging - upload files one by one
    console.log('Processing files one by one for debugging...');
    this.uploadFilesSequentially(files, owner, repoName, basePath, 0);
  }

  private uploadFilesSequentially(files: File[], owner: string, repoName: string, basePath: string, index: number): void {
    if (index >= files.length) {
      // All files uploaded
      console.log('All files uploaded successfully');
      this.refreshCurrentPath();
      this.isUploading = false;
      this.uploadCommitMessage = 'Add files via upload';
      return;
    }

    const file = files[index];
    const filePath = basePath ? `${basePath}/${file.name}` : file.name;

    console.log(`Uploading file ${index + 1}/${files.length}:`, { filePath, fileName: file.name, fileSize: file.size });

    this.studentService.uploadFile(owner, repoName, file, filePath, this.uploadCommitMessage, this.selectedUploadBranch).subscribe({
        next: (result) => {
          console.log(`File ${index + 1}/${files.length} uploaded successfully:`, result);
          // Upload next file
          this.uploadFilesSequentially(files, owner, repoName, basePath, index + 1);
        },
        error: (error) => {
          console.error(`Error uploading file ${index + 1}/${files.length}:`, error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url
          });

          // Log the server error response if available
          if (error.error) {
            console.error('Server error response:', error.error);
            if (typeof error.error === 'object') {
              console.error('Server error keys:', Object.keys(error.error));
              console.error('Server error values:', Object.values(error.error));
            }
          }

          // Show user-friendly error message
          let errorMessage = `Failed to upload file: ${file.name}`;
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.status === 401) {
            errorMessage = 'Authentication failed. Please check your GitHub connection.';
          } else if (error.status === 403) {
            errorMessage = 'Access denied. You may not have permission to upload to this repository.';
          } else if (error.status === 404) {
            errorMessage = 'Repository not found or branch does not exist.';
          } else if (error.status === 400) {
            errorMessage = 'Bad request. Please check your file and try again.';
          }

          alert('Upload failed: ' + errorMessage);
          this.isUploading = false;
        }
      });
  }

  private refreshCurrentPath(): void {
    if (!this.repository) {
      console.error('No repository data available for refresh');
      return;
    }

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];

    if (owner && repoName) {
      const path = this.currentPath.join('/');
      console.log('Refreshing file list:', { owner, repoName, path, branch: this.currentBranch });

      this.studentService.getRepositoryFiles(owner, repoName, path, this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files);
          console.log('File list refreshed successfully');
        },
        error: (error) => {
          console.error('Error refreshing file list:', error);
        }
      });
    } else {
      console.error('Unable to determine owner/repo for refresh:', { owner, repoName, repository: this.repository });
    }
  }

  // Image handling methods
  onImageError(event: any): void {
    this.imageLoadError = true;
  }

  // Reset image error state when opening a new file
  resetImageError(): void {
    this.imageLoadError = false;
  }

  // Get languages array for display
  getLanguageArray(): any[] {
    if (!this.repository?.languages) {
      return [];
    }

    const languages = this.repository.languages;
    const total = Object.values(languages).reduce((sum: number, bytes: any) => sum + bytes, 0);

    const languageColors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Java': '#b07219',
      'Python': '#3572A5',
      'C++': '#f34b7d',
      'C': '#555555',
      'C#': '#239120',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Swift': '#ffac45',
      'Kotlin': '#F18E33',
      'Dart': '#00B4AB',
      'Shell': '#89e051',
      'PowerShell': '#012456',
      'Dockerfile': '#384d54',
      'YAML': '#cb171e',
      'JSON': '#292929',
      'XML': '#0060ac',
      'Markdown': '#083fa1'
    };

    return Object.entries(languages)
      .map(([name, bytes]: [string, any]) => ({
        name,
        bytes,
        percentage: Math.round((bytes / total) * 100 * 10) / 10,
        color: languageColors[name] || '#858585'
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5); // Show top 5 languages
  }

  // Get all contributors including from commits and repository data
  getAllContributors(): any[] {
    const contributorsMap = new Map();

    // Add contributors from the contributors array
    if (this.contributors && this.contributors.length > 0) {
      this.contributors.forEach(contributor => {
        contributorsMap.set(contributor.name, {
          name: contributor.name,
          avatar: contributor.avatar,
          commits: contributor.commits
        });
      });
    }

    // Add contributors from latest commit and file data
    if (this.latestCommit && this.latestCommit.author) {
      if (!contributorsMap.has(this.latestCommit.author)) {
        contributorsMap.set(this.latestCommit.author, {
          name: this.latestCommit.author,
          avatar: this.latestCommit.avatarUrl || 'https://github.com/identicons/' + this.latestCommit.author + '.png',
          commits: 1
        });
      }
    }

    // Add contributors from file committers
    if (this.repositoryFiles && this.repositoryFiles.length > 0) {
      this.repositoryFiles.forEach((file: any) => {
        if (file.committer && !contributorsMap.has(file.committer)) {
          contributorsMap.set(file.committer, {
            name: file.committer,
            avatar: file.committerAvatar || 'https://github.com/identicons/' + file.committer + '.png',
            commits: 1
          });
        }
      });
    }

    // Add default contributors if none exist
    if (contributorsMap.size === 0) {
      const defaultCommitter = this.getDefaultCommitter();
      contributorsMap.set(defaultCommitter, {
        name: defaultCommitter,
        avatar: this.getDefaultCommitterAvatar(),
        commits: this.getTotalCommits()
      });
    }

    return Array.from(contributorsMap.values())
      .sort((a, b) => b.commits - a.commits);
  }
}
