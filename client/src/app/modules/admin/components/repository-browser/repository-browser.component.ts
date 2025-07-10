import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminRepositoryService, Repository, GitHubRepositoryDetails } from '../../../../shared/services/admin-repository.service';
import { WebhookService, WebhookSubscription } from '../../../../shared/services/webhook.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';

@Component({
  selector: 'app-repository-browser',
  templateUrl: './repository-browser.component.html',
  styleUrls: ['./repository-browser.component.css']
})
export class RepositoryBrowserComponent implements OnInit {
  // Utility for template: expose Object.keys and Object.values
  objectKeys = Object.keys;
  objectValues = Object.values;

  repository: Repository | null = null;
  githubDetails: GitHubRepositoryDetails | null = null;
  webhookSubscription: WebhookSubscription | null = null;
  
  loading = true;
  error: string | null = null;
  
  activeTab: 'overview' | 'files' | 'commits' | 'branches' | 'webhook' = 'overview';
  
  // File browser
  currentPath = '';
  currentBranch = '';
  files: any[] = [];
  fileContent: string | null = null;
  selectedFile: string | null = null;
  
  // Commits
  commits: any[] = [];
  commitsLoading = false;
  
  // Branches
  branches: string[] = [];
  
  // Actions
  actionLoading = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminRepositoryService: AdminRepositoryService,
    private readonly webhookService: WebhookService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const repositoryId = params['id'];
      if (repositoryId) {
        this.loadRepository(repositoryId);
      }
    });
  }

  async loadRepository(repositoryId: string): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      // Load repository details
      this.repository = await firstValueFrom(
        this.adminRepositoryService.getUserRepositories(repositoryId)
      ).then(repos => repos.find(r => r.id === repositoryId) || null);

      if (!this.repository) {
        this.error = 'Repository not found';
        return;
      }

      // Load GitHub details and webhook subscription in parallel
      const [githubDetails, webhookData] = await Promise.allSettled([
        firstValueFrom(this.adminRepositoryService.getGitHubRepositoryDetails(repositoryId)),
        firstValueFrom(this.webhookService.getRepositoryWebhookStatus(repositoryId))
      ]);

      if (githubDetails.status === 'fulfilled') {
        this.githubDetails = githubDetails.value;
        this.currentBranch = this.githubDetails.defaultBranch;
        this.branches = this.githubDetails.branches.map(b => b.name);
      }

      if (webhookData.status === 'fulfilled') {
        this.webhookSubscription = webhookData.value;
      }

      // Load initial files
      await this.loadFiles();

    } catch (error) {
      console.error('Error loading repository:', error);
      this.error = 'Failed to load repository details. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  setActiveTab(tab: 'overview' | 'files' | 'commits' | 'branches' | 'webhook'): void {
    this.activeTab = tab;
    
    if (tab === 'commits' && this.commits.length === 0) {
      this.loadCommits();
    }
  }

  async loadFiles(path: string = ''): Promise<void> {
    if (!this.repository) return;

    try {
      this.files = await firstValueFrom(
        this.adminRepositoryService.getRepositoryFiles(this.repository.id, this.currentBranch, path)
      );
      this.currentPath = path;
    } catch (error) {
      console.error('Error loading files:', error);
      this.snackbarService.showError('Failed to load repository files');
    }
  }
getMinValue(a: number, b: number): number {
  return Math.min(a, b);
}
  async loadFileContent(filePath: string): Promise<void> {
    if (!this.repository) return;

    try {
      const content = await firstValueFrom(
        this.adminRepositoryService.getFileContent(this.repository.id, filePath, this.currentBranch)
      );
      this.fileContent = atob(content.content); // Decode base64 content
      this.selectedFile = filePath;
    } catch (error) {
      console.error('Error loading file content:', error);
      this.snackbarService.showError('Failed to load file content');
    }
  }

  async loadCommits(): Promise<void> {
    if (!this.repository || this.commitsLoading) return;

    try {
      this.commitsLoading = true;
      const response = await firstValueFrom(
        this.adminRepositoryService.getRepositoryCommits(this.repository.id, this.currentBranch)
      );
      this.commits = response.commits || response; // Handle both object and array responses
    } catch (error) {
      console.error('Error loading commits:', error);
      this.snackbarService.showError('Failed to load repository commits');
    } finally {
      this.commitsLoading = false;
    }
  }

  async changeBranch(branch: string): Promise<void> {
    this.currentBranch = branch;
    this.currentPath = '';
    this.selectedFile = null;
    this.fileContent = null;
    
    if (this.activeTab === 'files') {
      await this.loadFiles();
    } else if (this.activeTab === 'commits') {
      await this.loadCommits();
    }
  }

  async navigateToFolder(folder: any): Promise<void> {
    if (folder.fileType === 'dir') {
      await this.loadFiles(folder.filePath);
    } else {
      await this.loadFileContent(folder.filePath);
    }
  }

  async navigateUp(): Promise<void> {
    const pathParts = this.currentPath.split('/').filter(p => p);
    pathParts.pop();
    const newPath = pathParts.join('/');
    await this.loadFiles(newPath);
  }

  async syncRepository(): Promise<void> {
    if (!this.repository || this.actionLoading) return;

    try {
      this.actionLoading = true;
      await firstValueFrom(
        this.adminRepositoryService.syncRepositoryData(this.repository.id)
      );
      this.snackbarService.showSuccess('Repository data synced successfully');
      
      // Reload repository details
      await this.loadRepository(this.repository.id);
    } catch (error) {
      console.error('Error syncing repository:', error);
      this.snackbarService.showError('Failed to sync repository data');
    } finally {
      this.actionLoading = false;
    }
  }

  async subscribeToWebhook(): Promise<void> {
    if (!this.repository || this.actionLoading) return;

    try {
      this.actionLoading = true;
      await firstValueFrom(
        this.webhookService.subscribeToWebhook(this.repository.id)
      );
      this.snackbarService.showSuccess('Successfully subscribed to webhook');
      
      // Reload webhook status
      this.webhookSubscription = await firstValueFrom(
        this.webhookService.getRepositoryWebhookStatus(this.repository.id)
      );
    } catch (error) {
      console.error('Error subscribing to webhook:', error);
      this.snackbarService.showError('Failed to subscribe to webhook');
    } finally {
      this.actionLoading = false;
    }
  }

  async unsubscribeFromWebhook(): Promise<void> {
    if (!this.repository || this.actionLoading) return;

    try {
      this.actionLoading = true;
      await firstValueFrom(
        this.webhookService.unsubscribeFromWebhook(this.repository.id)
      );
      this.snackbarService.showSuccess('Successfully unsubscribed from webhook');
      
      // Clear webhook status
      this.webhookSubscription = null;
    } catch (error) {
      console.error('Error unsubscribing from webhook:', error);
      this.snackbarService.showError('Failed to unsubscribe from webhook');
    } finally {
      this.actionLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  openOnGitHub(): void {
    if (this.repository) {
      window.open(this.repository.url, '_blank');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(file: any): string {
    if (file.fileType === 'dir') return 'fas fa-folder';
    
    const extension = file.fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': case 'ts': return 'fab fa-js-square';
      case 'html': return 'fab fa-html5';
      case 'css': case 'scss': return 'fab fa-css3-alt';
      case 'json': return 'fas fa-code';
      case 'md': return 'fab fa-markdown';
      case 'py': return 'fab fa-python';
      case 'java': return 'fab fa-java';
      case 'xml': return 'fas fa-code';
      case 'yml': case 'yaml': return 'fas fa-cog';
      default: return 'fas fa-file';
    }
  }

  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'SCSS': '#c6538c',
      'Shell': '#89e051',
      'Dockerfile': '#384d54'
    };
    return colors[language] || '#666';
  }

getLanguagePercentage(lang: string): string {
  if (!this.githubDetails?.languages) return '0';
  const total = this.objectValues(this.githubDetails.languages).reduce((a, b) => a + b, 0);
  return ((this.githubDetails.languages[lang] / total) * 100).toFixed(1);
}

  getFileColor(file: any): string {
    if (file.fileType === 'dir') return '#ffd700'; // Gold for folders
    
    const extension = file.fileName?.split('.').pop()?.toLowerCase();
    const colorMap: { [key: string]: string } = {
      'js': '#f1e05a',
      'ts': '#2b7489',
      'html': '#e34c26',
      'css': '#563d7c',
      'scss': '#c6538c',
      'py': '#3572A5',
      'java': '#b07219',
      'json': '#292929',
      'md': '#083fa1',
      'xml': '#0060ac',
      'yml': '#cb171e',
      'yaml': '#cb171e'
    };
    return colorMap[extension || ''] || '#6b7280';
  }

  async openFile(file: any, event: Event): Promise<void> {
    event.stopPropagation(); // Prevent folder navigation
    if (!this.repository) return;

    try {
      await this.loadFileContent(file.filePath);
    } catch (error) {
      console.error('Error opening file:', error);
      this.snackbarService.showError('Failed to open file');
    }
  }

  async downloadFile(file: any, event: Event): Promise<void> {
    event.stopPropagation(); // Prevent folder navigation
    if (!this.repository) return;

    try {
      const content = await firstValueFrom(
        this.adminRepositoryService.getFileContent(this.repository.id, file.filePath, this.currentBranch)
      );
      
      // Decode base64 content
      const decodedContent = atob(content.content);
      
      // Create blob and download
      const blob = new Blob([decodedContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackbarService.showSuccess(`Downloaded ${file.fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      this.snackbarService.showError('Failed to download file');
    }
  }

}
