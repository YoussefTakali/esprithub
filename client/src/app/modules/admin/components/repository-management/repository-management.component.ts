import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminRepositoryService, Repository } from '../../../../shared/services/admin-repository.service';
import { WebhookService, WebhookStats } from '../../../../shared/services/webhook.service';
import { SnackbarService } from '../../../../shared/services/snackbar.service';

@Component({
  selector: 'app-repository-management',
  templateUrl: './repository-management.component.html',
  styleUrls: ['./repository-management.component.css']
})
export class RepositoryManagementComponent implements OnInit {
  repositories: Repository[] = [];
  filteredRepositories: Repository[] = [];
  webhookStats: WebhookStats | null = null;
  
  loading = true;
  error: string | null = null;
  actionLoading = false;
  
  // Filters and search
  searchQuery = '';
  selectedOwner = '';
  selectedStatus = '';
  selectedVisibility = '';
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Unique values for filters
  owners: string[] = [];
  
  constructor(
    private readonly router: Router,
    private readonly adminRepositoryService: AdminRepositoryService,
    private readonly webhookService: WebhookService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadRepositories();
    this.loadWebhookStats();
  }

  async loadRepositories(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      let repositories: Repository[];
      
      if (this.searchQuery.trim()) {
        const result = await firstValueFrom(
          this.adminRepositoryService.searchRepositories(this.searchQuery, this.currentPage, this.pageSize)
        );
        repositories = result.content;
        this.totalElements = result.totalElements;
        this.totalPages = result.totalPages;
      } else {
        const result = await firstValueFrom(
          this.adminRepositoryService.getAllRepositories(this.currentPage, this.pageSize)
        );
        repositories = result.content;
        this.totalElements = result.totalElements;
        this.totalPages = result.totalPages;
      }

      this.repositories = repositories;
      this.applyFilters();
      this.extractUniqueValues();

    } catch (error) {
      console.error('Error loading repositories:', error);
      this.error = 'Failed to load repositories. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async loadWebhookStats(): Promise<void> {
    try {
      this.webhookStats = await firstValueFrom(this.webhookService.getWebhookStatistics());
    } catch (error) {
      console.error('Error loading webhook statistics:', error);
      // Don't show error for stats as it's not critical
    }
  }

  applyFilters(): void {
    this.filteredRepositories = this.repositories.filter(repo => {
      const matchesOwner = !this.selectedOwner || repo.owner.email === this.selectedOwner;
      const matchesVisibility = !this.selectedVisibility || 
        (this.selectedVisibility === 'private' && repo.isPrivate) ||
        (this.selectedVisibility === 'public' && !repo.isPrivate);
      const matchesStatus = !this.selectedStatus ||
        (this.selectedStatus === 'active' && repo.isActive) ||
        (this.selectedStatus === 'inactive' && !repo.isActive);

      return matchesOwner && matchesVisibility && matchesStatus;
    });
  }
getMinValue(a: number, b: number): number {
  return Math.min(a, b);
}
  extractUniqueValues(): void {
    this.owners = [...new Set(this.repositories.map(repo => repo.owner.email))].sort();
  }

  onSearchChange(): void {
    this.currentPage = 0;
    this.loadRepositories();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedOwner = '';
    this.selectedStatus = '';
    this.selectedVisibility = '';
    this.currentPage = 0;
    this.loadRepositories();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRepositories();
  }

  viewRepository(repository: Repository): void {
    this.router.navigate(['/admin/repositories', repository.id]);
  }

  viewUserDetails(repository: Repository): void {
    this.router.navigate(['/admin/users', repository.owner.id]);
  }

  async syncRepository(repository: Repository): Promise<void> {
    try {
      this.actionLoading = true;
      
      await firstValueFrom(
        this.adminRepositoryService.syncRepositoryData(repository.id)
      );
      
      this.snackbarService.showSuccess(`Successfully synced ${repository.fullName}`);
      
    } catch (error) {
      console.error('Error syncing repository:', error);
      this.snackbarService.showError('Failed to sync repository data');
    } finally {
      this.actionLoading = false;
    }
  }

  async subscribeToWebhook(repository: Repository): Promise<void> {
    try {
      this.actionLoading = true;
      
      await firstValueFrom(
        this.webhookService.adminSubscribeToWebhook(repository.id, repository.owner.id)
      );
      
      this.snackbarService.showSuccess(`Successfully subscribed to webhook for ${repository.fullName}`);
      
      // Reload webhook stats
      await this.loadWebhookStats();
      
    } catch (error) {
      console.error('Error subscribing to webhook:', error);
      this.snackbarService.showError('Failed to subscribe to webhook');
    } finally {
      this.actionLoading = false;
    }
  }

  async unsubscribeFromWebhook(repository: Repository): Promise<void> {
    try {
      this.actionLoading = true;
      
      await firstValueFrom(
        this.webhookService.adminUnsubscribeFromWebhook(repository.id, repository.owner.id)
      );
      
      this.snackbarService.showSuccess(`Successfully unsubscribed from webhook for ${repository.fullName}`);
      
      // Reload webhook stats
      await this.loadWebhookStats();
      
    } catch (error) {
      console.error('Error unsubscribing from webhook:', error);
      this.snackbarService.showError('Failed to unsubscribe from webhook');
    } finally {
      this.actionLoading = false;
    }
  }

  async fetchAllRepositories(): Promise<void> {
    if (!confirm('🚀 BULK FETCH: This will fetch ALL repositories for ALL users with GitHub tokens. This may take 10-30 minutes depending on the number of users. Continue?')) {
      return;
    }

    try {
      this.actionLoading = true;

      const response = await firstValueFrom(
        this.adminRepositoryService.fetchAllRepositories()
      );

      console.log('Bulk fetch response:', response);

      this.snackbarService.showSuccess(
        `🚀 Bulk repository fetch started! Processing ${response.usersToProcess || 0} users. Check browser console and server logs for progress.`
      );

      // Start polling for status updates
      this.pollBulkFetchStatus();

    } catch (error) {
      console.error('Error triggering bulk repository fetch:', error);
      this.snackbarService.showError('Failed to trigger bulk repository fetch');
    } finally {
      this.actionLoading = false;
    }
  }

  private pollBulkFetchStatus(): void {
    const pollInterval = setInterval(async () => {
      try {
        const status = await firstValueFrom(
          this.adminRepositoryService.getBulkFetchStatus()
        );

        console.log('📊 Bulk fetch status:', status);

        if (!status.inProgress) {
          clearInterval(pollInterval);
          this.snackbarService.showSuccess('✅ Bulk repository fetch completed! Refreshing data...');

          // Reload repositories
          setTimeout(() => {
            this.loadRepositories();
          }, 2000);
        }

      } catch (error) {
        console.error('Error checking bulk fetch status:', error);
        clearInterval(pollInterval);
      }
    }, 10000); // Check every 10 seconds

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30 * 60 * 1000);
  }

  async bulkSubscribeWebhooks(): Promise<void> {
    if (!confirm('Are you sure you want to subscribe to webhooks for all repositories? This may take a while.')) {
      return;
    }

    try {
      this.actionLoading = true;

      let successCount = 0;
      let failureCount = 0;

      for (const repository of this.filteredRepositories) {
        try {
          await firstValueFrom(
            this.webhookService.adminSubscribeToWebhook(repository.id, repository.owner.id)
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to subscribe to webhook for ${repository.fullName}:`, error);
          failureCount++;
        }
      }

      this.snackbarService.showSuccess(
        `Bulk webhook subscription completed. Success: ${successCount}, Failures: ${failureCount}`
      );

      // Reload webhook stats
      await this.loadWebhookStats();

    } catch (error) {
      console.error('Error in bulk webhook subscription:', error);
      this.snackbarService.showError('Failed to complete bulk webhook subscription');
    } finally {
      this.actionLoading = false;
    }
  }

  openOnGitHub(repository: Repository): void {
    window.open(repository.url, '_blank');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getVisibilityIcon(isPrivate: boolean): string {
    return isPrivate ? 'fas fa-lock' : 'fas fa-globe';
  }

  getVisibilityText(isPrivate: boolean): string {
    return isPrivate ? 'Private' : 'Public';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
