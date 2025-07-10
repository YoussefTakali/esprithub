# EspritHub Webhook System

## Overview

The EspritHub Webhook System provides comprehensive GitHub integration with automatic webhook subscription management, real-time repository data synchronization, and a powerful admin dashboard for monitoring and managing all webhook activities across the platform.

## 🚀 Features

### Backend Features
- **Automatic Webhook Subscription**: Automatically subscribes to webhooks for all user repositories
- **Real-time Data Sync**: Synchronizes repository data (commits, branches, releases) when GitHub events occur
- **Webhook Security**: Validates webhook signatures to ensure authenticity
- **Comprehensive Event Handling**: Supports all major GitHub events (push, pull_request, issues, create, delete, release, fork, watch)
- **Failure Recovery**: Automatic retry mechanism for failed webhook subscriptions
- **Health Monitoring**: Regular health checks and cleanup of stale webhooks
- **Admin Management**: Full admin control over webhook subscriptions

### Frontend Features
- **Admin Dashboard**: Comprehensive admin interface for webhook management
- **User Details View**: Detailed user information with repositories, tasks, and webhook status
- **Repository Browser**: Browse GitHub repositories with webhook integration
- **Repository Management**: Manage all repositories and webhook subscriptions
- **Real-time Statistics**: Live webhook statistics and monitoring
- **Bulk Operations**: Bulk webhook subscription management

## 🏗️ Architecture

### Backend Components

#### 1. Entities
- **WebhookSubscription**: Tracks webhook subscriptions for each repository
- **Repository**: Enhanced with webhook relationship
- **User**: GitHub integration with token management

#### 2. Services
- **GitHubWebhookService**: Handles webhook subscription/unsubscription via GitHub API
- **RepositoryDataSyncService**: Syncs repository data when webhooks are received
- **WebhookSubscriptionScheduler**: Automated webhook management and health checks

#### 3. Controllers
- **GitHubWebhookController**: Receives and processes GitHub webhooks
- **WebhookManagementController**: Admin API for webhook management
- **AdminUserController**: Admin API for user and repository management

#### 4. Configuration
- **WebhookProperties**: Configurable webhook settings
- **Scheduling**: Automated tasks for webhook management

### Frontend Components

#### 1. Services
- **WebhookService**: Angular service for webhook API interactions
- **AdminRepositoryService**: Service for admin repository management

#### 2. Components
- **UserDetailsComponent**: Detailed user view with repositories and tasks
- **RepositoryBrowserComponent**: GitHub repository browser with webhook integration
- **RepositoryManagementComponent**: Admin repository and webhook management
- **Enhanced UserManagementComponent**: Added user details navigation

## 📋 Configuration

### Environment Variables

```bash
# Webhook Configuration
WEBHOOK_BASE_URL=https://yourdomain.com
WEBHOOK_SECRET=your-secure-webhook-secret

# GitHub Integration
GITHUB_TOKEN=your-github-token
```

### Application Properties

```properties
# GitHub Webhook Configuration
app.webhook.base-url=${WEBHOOK_BASE_URL:http://localhost:8090}
app.webhook.endpoint=/api/github/webhook
app.webhook.secret=${WEBHOOK_SECRET:your-webhook-secret-change-in-production}
app.webhook.events=push,pull_request,issues,create,delete,release,fork,watch

# Scheduling Configuration
app.webhook.scheduling.subscription-check-interval=30
app.webhook.scheduling.health-check-interval=6
app.webhook.scheduling.enabled=true

# Retry Configuration
app.webhook.retry.max-attempts=3
app.webhook.retry.max-failures=5
app.webhook.retry.retry-delay=15
```

## 🔧 Setup Instructions

### 1. Backend Setup

1. **Database Migration**: The webhook subscription table will be created automatically via Flyway migration
2. **Configuration**: Set the required environment variables
3. **GitHub App**: Configure your GitHub App with webhook permissions
4. **Webhook URL**: Ensure your webhook URL is accessible from GitHub

### 2. Frontend Setup

1. **Services**: The webhook and admin repository services are automatically available
2. **Routing**: New admin routes are configured for user details and repository management
3. **Navigation**: Repository management link added to admin dashboard

### 3. GitHub Configuration

1. **Webhook URL**: `https://yourdomain.com/api/github/webhook`
2. **Content Type**: `application/json`
3. **Secret**: Use the same secret configured in your application
4. **Events**: The system will automatically configure the required events

## 🎯 Usage

### Admin Dashboard

1. **Navigate to Admin**: Go to `/admin/repositories`
2. **View Statistics**: See webhook subscription statistics
3. **Manage Repositories**: Search, filter, and manage all repositories
4. **Bulk Operations**: Subscribe to webhooks for multiple repositories
5. **User Details**: Click on users to see detailed information

### User Details

1. **Navigate**: Go to `/admin/users/{userId}`
2. **View Tabs**: Overview, Repositories, Tasks, Webhooks
3. **Manage Webhooks**: Subscribe/unsubscribe from webhooks
4. **Sync Data**: Manually sync repository data

### Repository Browser

1. **Navigate**: Go to `/admin/repositories/{repositoryId}`
2. **Browse Files**: Navigate through repository files and folders
3. **View Commits**: See commit history and details
4. **Manage Branches**: Switch between branches
5. **Webhook Status**: Monitor webhook subscription status

## 🔄 Automated Processes

### Webhook Subscription Scheduler

- **Frequency**: Every 30 minutes (configurable)
- **Function**: Automatically subscribes to webhooks for new repositories
- **Scope**: All active users with GitHub tokens

### Health Check Scheduler

- **Frequency**: Every 6 hours (configurable)
- **Function**: Checks webhook health and retries failed subscriptions
- **Monitoring**: Identifies stale webhooks and subscription issues

### Cleanup Scheduler

- **Frequency**: Daily at 2 AM
- **Function**: Cleans up old inactive webhook data
- **Retention**: 30 days for inactive webhooks

## 📊 Monitoring

### Webhook Statistics

- **Total Subscriptions**: Overall webhook subscription count
- **Active Webhooks**: Currently active and functioning webhooks
- **Failed Webhooks**: Webhooks that have failed and need attention
- **Inactive Webhooks**: Disabled or unsubscribed webhooks

### Health Indicators

- **Last Ping**: When GitHub last pinged the webhook
- **Last Delivery**: Last successful webhook delivery
- **Failure Count**: Number of consecutive failures
- **Error Messages**: Detailed error information for troubleshooting

## 🔐 Security

### Webhook Signature Validation

- **HMAC SHA-256**: All webhooks are validated using HMAC SHA-256 signatures
- **Secret Management**: Webhook secrets are securely stored and managed
- **Request Validation**: Invalid signatures are rejected

### Access Control

- **Admin Only**: Webhook management requires admin privileges
- **User Ownership**: Users can only manage their own repository webhooks
- **Token Security**: GitHub tokens are securely stored and managed

## 🚨 Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL accessibility
   - Verify GitHub App permissions
   - Check webhook secret configuration

2. **Failed Webhook Subscriptions**
   - Verify GitHub token validity
   - Check repository permissions
   - Review error logs for specific issues

3. **Data Not Syncing**
   - Check webhook delivery status
   - Verify event configuration
   - Review sync service logs

### Logs and Monitoring

- **Application Logs**: Check for webhook processing errors
- **Database Logs**: Monitor webhook subscription status
- **GitHub Logs**: Review webhook delivery attempts in GitHub

## 🔮 Future Enhancements

- **Webhook Analytics**: Detailed analytics and reporting
- **Custom Event Handlers**: Configurable event processing
- **Multi-Platform Support**: Support for GitLab, Bitbucket, etc.
- **Advanced Filtering**: More sophisticated webhook filtering options
- **Real-time Notifications**: Live notifications for webhook events

## 📞 Support

For issues or questions regarding the webhook system:

1. Check the application logs for error details
2. Review the webhook subscription status in the admin dashboard
3. Verify GitHub App configuration and permissions
4. Contact the development team with specific error messages and logs

---

**Note**: This webhook system is designed to be robust and self-healing, with automatic retry mechanisms and health monitoring to ensure reliable GitHub integration.
