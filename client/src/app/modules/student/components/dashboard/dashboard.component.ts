import { Component, OnInit } from '@angular/core';
import { StudentService, StudentDashboard } from '../../services/student.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  dashboard: StudentDashboard | null = null;
  loading = true;
  error: string | null = null;

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;
    
    this.studentService.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.error = 'Failed to load dashboard. Please try again.';
        this.loading = false;
      }
    });
  }

  markNotificationAsRead(notificationId: string): void {
    this.studentService.markNotificationAsRead(notificationId).subscribe({
      next: () => {
        if (this.dashboard) {
          const notification = this.dashboard.recentNotifications.find(n => n.id === notificationId);
          if (notification) {
            notification.read = true;
          }
        }
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  getNotificationIcon(type: 'info' | 'warning' | 'success' | 'error'): string {
    switch (type) {
      case 'info': return 'fas fa-info-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-times-circle';
      default: return 'fas fa-bell';
    }
  }

  getNotificationColor(type: 'info' | 'warning' | 'success' | 'error'): string {
    switch (type) {
      case 'info': return '#17a2b8';
      case 'warning': return '#ffc107';
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getDaysUntilDeadline(dueDate: Date): number {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  refresh(): void {
    this.loadDashboard();
  }
}
