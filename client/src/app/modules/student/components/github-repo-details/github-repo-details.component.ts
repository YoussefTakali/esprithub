import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { GitHubService } from '../../../../services/github.service';

@Component({
  selector: 'app-github-repo-details',
  templateUrl: './github-repo-details.component.html',
  styleUrls: ['./github-repo-details.component.css']
})
export class GitHubRepoDetailsComponent implements OnInit {
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
  selectedFile: any = null;
  selectedCommit: any = null;
  fileContent = '';
  currentPath: string[] = [];
  currentBranch: string = 'main';
  
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
    // Load commits with pagination
    this.studentService.getRepositoryCommits(owner, repo, this.currentBranch, 1, 20).subscribe({
      next: (commits: any[]) => {
        this.commits = commits;
        this.processCommitData(commits);
      },
      error: (error) => console.error('Error loading commits:', error)
    });

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
      this.latestCommit = {
        message: latestCommit.message,
        author: latestCommit.authorName ?? latestCommit.githubAuthorLogin,
        date: this.formatDate(latestCommit.authorDate ?? latestCommit.committerDate),
        sha: latestCommit.sha?.substring(0, 7) ?? 'unknown',
        url: latestCommit.htmlUrl,
        avatarUrl: latestCommit.githubAuthorAvatarUrl
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
    return files.map((file: any) => ({
      name: file.name,
      type: file.type === 'dir' ? 'folder' : 'file',
      size: file.sizeFormatted ?? this.formatFileSize(file.size ?? 0),
      lastModified: this.formatDate(file.lastModified) ?? 'Unknown',
      message: file.lastCommitMessage ?? 'Initial commit',
      committer: file.lastCommitAuthor ?? 'Unknown',
      path: file.path,
      downloadUrl: file.downloadUrl,
      htmlUrl: file.htmlUrl,
      sha: file.sha,
      category: file.category,
      extension: file.extension,
      capabilities: file.capabilities
    }));
  }

  private processCommitData(commits: any[]): void {
    // Update commits array and extract latest commit if not already set
    this.commits = commits.map(commit => ({
      sha: commit.sha,
      shortSha: commit.sha?.substring(0, 7) ?? 'unknown',
      message: commit.message,
      author: commit.authorName ?? commit.githubAuthorLogin,
      authorEmail: commit.authorEmail,
      date: this.formatDate(commit.authorDate ?? commit.committerDate),
      url: commit.htmlUrl,
      avatarUrl: commit.githubAuthorAvatarUrl
    }));

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
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
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
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split('/')[0];
    const repoName = this.repository.name ?? this.repository.fullName?.split('/')[1];
    
    if (owner && repoName) {
      this.studentService.getFileContent(owner, repoName, file.path, this.currentBranch).subscribe({
        next: (content: any) => {
          this.selectedFile = { ...file, ...content };
          this.fileContent = this.decodeBase64Content(content.content);
          this.showFileContent = true;
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

  closeFileView(): void {
    this.showFileContent = false;
    this.selectedFile = null;
    this.fileContent = '';
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

  // Branch operations
  switchBranch(branchName: string): void {
    this.currentBranch = branchName;
    this.navigateToRoot(); // Reload files for new branch
  }

  // Commit operations
  showCommitDetailsView(commit: any): void {
    this.selectedCommit = commit;
    this.showCommitDetails = true;
  }

  closeCommitDetails(): void {
    this.showCommitDetails = false;
    this.selectedCommit = null;
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
    
    return {
      sha: this.selectedCommit.shortSha,
      message: this.selectedCommit.message,
      author: this.selectedCommit.author,
      date: this.selectedCommit.date,
      changes: [
        // This would be populated from actual commit diff data
        // For now, using placeholder data since GitHub API doesn't provide
        // file changes in the commits endpoint
        {
          file: 'Files changed in this commit',
          type: 'modified',
          additions: 0,
          deletions: 0,
          isBinary: false,
          diff: 'File diff information not available via GitHub API'
        }
      ],
      stats: {
        additions: 0,
        deletions: 0,
        changedFiles: 0
      }
    };
  }
}
