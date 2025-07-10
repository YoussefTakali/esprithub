import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebhookSubscription {
  id: string;
  webhookId: string;
  webhookUrl: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'PENDING';
  events: string;
  lastPing?: string;
  lastDelivery?: string;
  failureCount: number;
  lastError?: string;
  subscriptionDate: string;
  repository: {
    id: string;
    name: string;
    fullName: string;
    description?: string;
    url: string;
    isPrivate: boolean;
    defaultBranch: string;
    owner: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      githubUsername?: string;
    };
  };
}

export interface WebhookStatus {
  totalSubscriptions: number;
  activeSubscriptions: number;
  failedSubscriptions: number;
  inactiveSubscriptions: number;
  subscriptions: WebhookSubscription[];
}

export interface WebhookStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  failedSubscriptions: number;
  inactiveSubscriptions: number;
}

export interface WebhookResponse {
  message: string;
  webhookId?: string;
  status?: string;
  repositoryName?: string;
  totalRepositories?: number;
  successCount?: number;
  failureCount?: number;
}

export interface PagedWebhookSubscriptions {
  content: WebhookSubscription[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/webhooks`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Get webhook subscription status for current user
   */
  getWebhookStatus(): Observable<WebhookStatus> {
    return this.http.get<WebhookStatus>(`${this.baseUrl}/status`);
  }

  /**
   * Get webhook subscriptions with pagination
   */
  getWebhookSubscriptions(
    page: number = 0,
    size: number = 10,
    status?: 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'PENDING'
  ): Observable<PagedWebhookSubscriptions> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<PagedWebhookSubscriptions>(this.baseUrl, { params });
  }

  /**
   * Subscribe to webhook for a specific repository
   */
  subscribeToWebhook(repositoryId: string): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.baseUrl}/subscribe/${repositoryId}`, {});
  }

  /**
   * Unsubscribe from webhook for a specific repository
   */
  unsubscribeFromWebhook(repositoryId: string): Observable<{ message: string; repositoryName: string }> {
    return this.http.delete<{ message: string; repositoryName: string }>(`${this.baseUrl}/unsubscribe/${repositoryId}`);
  }

  /**
   * Re-register webhook for a specific repository
   */
  reregisterWebhook(repositoryId: string): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.baseUrl}/reregister/${repositoryId}`, {});
  }

  /**
   * Bulk subscribe to webhooks for all user's repositories
   */
  subscribeToAllWebhooks(): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.baseUrl}/subscribe-all`, {});
  }

  /**
   * Get webhook statistics (admin only)
   */
  getWebhookStatistics(): Observable<WebhookStats> {
    return this.http.get<WebhookStats>(`${this.baseUrl}/stats`);
  }

  /**
   * Get webhook subscription status for a specific repository
   */
  getRepositoryWebhookStatus(repositoryId: string): Observable<WebhookSubscription | null> {
    return this.http.get<WebhookSubscription | null>(`${this.baseUrl}/repository/${repositoryId}/status`);
  }

  /**
   * Get webhook subscriptions for a specific user (admin only)
   */
  getUserWebhookSubscriptions(
    userId: string,
    page: number = 0,
    size: number = 10
  ): Observable<PagedWebhookSubscriptions> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PagedWebhookSubscriptions>(`${this.baseUrl}/user/${userId}`, { params });
  }

  /**
   * Subscribe to webhook for a specific repository as admin
   */
  adminSubscribeToWebhook(repositoryId: string, userId: string): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.baseUrl}/admin/subscribe/${repositoryId}`, { userId });
  }

  /**
   * Unsubscribe from webhook for a specific repository as admin
   */
  adminUnsubscribeFromWebhook(repositoryId: string, userId: string): Observable<{ message: string; repositoryName: string }> {
    return this.http.delete<{ message: string; repositoryName: string }>(`${this.baseUrl}/admin/unsubscribe/${repositoryId}`, {
      body: { userId }
    });
  }

  /**
   * Get webhook delivery history for a repository
   */
  getWebhookDeliveryHistory(repositoryId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/repository/${repositoryId}/deliveries`);
  }

  /**
   * Test webhook connectivity for a repository
   */
  testWebhook(repositoryId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/repository/${repositoryId}/test`, {});
  }
}
