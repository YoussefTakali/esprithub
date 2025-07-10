import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminRepositoryService, UserDetails, Repository, Task } from '../../../../shared/services/admin-repository.service';
import { WebhookService, WebhookSubscription } from '../../../../shared/services/webhook.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css']
})
export class UserDetailsComponent implements OnInit {
  user: UserDetails | null = null;
  repositories: Repository[] = [];
  tasks: Task[] = [];
  webhookSubscriptions: WebhookSubscription[] = [];
  
  loading = true;
  error: string | null = null;
  
  activeTab: 'overview' | 'repositories' | 'tasks' | 'webhooks' = 'overview';
  
  // Repository management
  repositoryLoading = false;
  webhookLoading = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminRepositoryService: AdminRepositoryService,
    private readonly webhookService: WebhookService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const userId = params['id'];
      console.log('User ID from route params:', userId);
      if (userId && userId.trim()) {
        this.loadUserDetails(userId);
      } else {
        this.error = 'Invalid user ID';
        this.loading = false;
      }
    });
  }

  async loadUserDetails(userId: string): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      // Load user details, repositories, and tasks in parallel
      const [userDetails, repositories, tasks] = await Promise.all([
        firstValueFrom(this.adminRepositoryService.getUserDetails(userId)),
        firstValueFrom(this.adminRepositoryService.getUserRepositories(userId)),
        firstValueFrom(this.adminRepositoryService.getUserTasks(userId))
      ]);

      this.user = userDetails;
      this.repositories = repositories || [];
      this.tasks = tasks || [];

      // Load webhook subscriptions if user has repositories
      if (this.repositories.length > 0) {
        await this.loadWebhookSubscriptions(userId);
      }

    } catch (error) {
      console.error('Error loading user details:', error);
      this.error = 'Failed to load user details. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async loadWebhookSubscriptions(userId: string): Promise<void> {
    try {
      const webhookData = await firstValueFrom(
        this.webhookService.getUserWebhookSubscriptions(userId, 0, 100)
      );
      this.webhookSubscriptions = webhookData.content || [];
    } catch (error) {
      console.error('Error loading webhook subscriptions:', error);
      // Don't show error for webhooks as it's not critical
    }
  }

  setActiveTab(tab: 'overview' | 'repositories' | 'tasks' | 'webhooks'): void {
    this.activeTab = tab;
  }
getActiveWebhooksCount(): number {
  if (!this.webhookSubscriptions) return 0;
  return this.webhookSubscriptions.filter(ws => ws.status === 'ACTIVE').length;
}
  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  async subscribeToWebhook(repository: Repository): Promise<void> {
    try {
      this.webhookLoading = true;
      
      await firstValueFrom(
        this.webhookService.adminSubscribeToWebhook(repository.id, repository.owner.id)
      );
      
      this.snackbarService.showSuccess(`Successfully subscribed to webhook for ${repository.fullName}`);
      
      // Reload webhook subscriptions
      if (this.user) {
        await this.loadWebhookSubscriptions(this.user.id);
      }
      
    } catch (error) {
      console.error('Error subscribing to webhook:', error);
      this.snackbarService.showError('Failed to subscribe to webhook. Please try again.');
    } finally {
      this.webhookLoading = false;
    }
  }

  async unsubscribeFromWebhook(repository: Repository): Promise<void> {
    try {
      this.webhookLoading = true;
      
      await firstValueFrom(
        this.webhookService.adminUnsubscribeFromWebhook(repository.id, repository.owner.id)
      );
      
      this.snackbarService.showSuccess(`Successfully unsubscribed from webhook for ${repository.fullName}`);
      
      // Reload webhook subscriptions
      if (this.user) {
        await this.loadWebhookSubscriptions(this.user.id);
      }
      
    } catch (error) {
      console.error('Error unsubscribing from webhook:', error);
      this.snackbarService.showError('Failed to unsubscribe from webhook. Please try again.');
    } finally {
      this.webhookLoading = false;
    }
  }

  async reregisterWebhook(repository: Repository): Promise<void> {
    try {
      this.webhookLoading = true;
      
      await firstValueFrom(
        this.webhookService.reregisterWebhook(repository.id)
      );
      
      this.snackbarService.showSuccess(`Successfully re-registered webhook for ${repository.fullName}`);
      
      // Reload webhook subscriptions
      if (this.user) {
        await this.loadWebhookSubscriptions(this.user.id);
      }
      
    } catch (error) {
      console.error('Error re-registering webhook:', error);
      this.snackbarService.showError('Failed to re-register webhook. Please try again.');
    } finally {
      this.webhookLoading = false;
    }
  }

  async syncRepositoryData(repository: Repository): Promise<void> {
    try {
      this.repositoryLoading = true;
      
      await firstValueFrom(
        this.adminRepositoryService.syncRepositoryData(repository.id)
      );
      
      this.snackbarService.showSuccess(`Successfully synced data for ${repository.fullName}`);
      
    } catch (error) {
      console.error('Error syncing repository data:', error);
      this.snackbarService.showError('Failed to sync repository data. Please try again.');
    } finally {
      this.repositoryLoading = false;
    }
  }

  viewRepository(repository: Repository): void {
    this.router.navigate(['/admin/repositories', repository.id]);
  }

  async fetchRepositories(): Promise<void> {
    if (!this.user?.id) {
      this.snackbarService.showError('User ID not available');
      return;
    }

    if (!this.user.githubUsername) {
      this.snackbarService.showError('User does not have a GitHub username');
      return;
    }

    try {
      this.loading = true;

      await firstValueFrom(
        this.adminRepositoryService.fetchUserRepositories(this.user.id)
      );

      this.snackbarService.showSuccess('Repository fetch triggered successfully! Refreshing data...');

      // Reload user details to get fresh repository data
      await this.loadUserDetails(this.user.id);

    } catch (error) {
      console.error('Error fetching repositories:', error);
      this.snackbarService.showError('Failed to fetch repositories from GitHub');
    } finally {
      this.loading = false;
    }
  }

  getWebhookSubscription(repositoryId: string): WebhookSubscription | null {
    return this.webhookSubscriptions.find(ws => ws.repository.id === repositoryId) || null;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'FAILED': return 'status-failed';
      case 'INACTIVE': return 'status-inactive';
      case 'PENDING': return 'status-pending';
      default: return 'status-unknown';
    }
  }

  getTaskStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'task-completed';
      case 'IN_PROGRESS': return 'task-in-progress';
      case 'NOT_STARTED': return 'task-not-started';
      case 'CANCELLED': return 'task-cancelled';
      default: return 'task-unknown';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'priority-urgent';
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return 'priority-unknown';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'CHIEF': return 'Department Chief';
      case 'TEACHER': return 'Teacher';
      case 'STUDENT': return 'Student';
      default: return role;
    }
  }
}
