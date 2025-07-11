import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { StudentService, StudentTask } from '../../services/student.service';
import { SubmissionService } from '../../../../shared/services/submission.service';
import { SubmissionDialogComponent } from '../submissions/submission-dialog.component';

@Component({
  selector: 'app-student-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class StudentTasksComponent implements OnInit {
  tasks: StudentTask[] = [];
  filteredTasks: StudentTask[] = [];
  loading = true;
  error: string | null = null;
  
  // Filters
  selectedFilter = 'all';
  searchTerm = '';
  selectedType = 'all';
  selectedStatus = 'all';

  constructor(
    private readonly studentService: StudentService,
    private readonly dialog: MatDialog,
    private readonly submissionService: SubmissionService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Loading tasks...');
    this.studentService.getTasks().subscribe({
      next: (tasks) => {
        console.log('Tasks received:', tasks);
        this.tasks = tasks;
        this.applyFilters();
        this.loading = false;
        console.log('Filtered tasks:', this.filteredTasks);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.error = 'Failed to load tasks. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.tasks];

    // Search filter
    if (this.searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(task => task.type === this.selectedType);
    }

    // Status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(task => task.status === this.selectedStatus);
    }

    // Main filter
    switch (this.selectedFilter) {
      case 'active':
        filtered = filtered.filter(task => 
          ['PENDING', 'IN_PROGRESS'].includes(task.status)
        );
        break;
      case 'completed':
        filtered = filtered.filter(task => task.status === 'COMPLETED');
        break;
      case 'overdue': {
        const now = new Date();
        filtered = filtered.filter(task => 
          new Date(task.dueDate) < now && task.status !== 'COMPLETED'
        );
        break;
      }
    }

    filtered.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    this.filteredTasks = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  getTaskPriority(task: StudentTask): 'high' | 'medium' | 'low' {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'high'; // Overdue
    if (daysUntilDue <= 2) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }

  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '#a71617';
      case 'medium': return '#fd7e14';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'IN_PROGRESS': return '#17a2b8';
      case 'PENDING': return '#ffc107';
      case 'DRAFT': return '#6c757d';
      default: return '#6c757d';
    }
  }

  getDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  isOverdue(dueDate: Date, status: string): boolean {
    return new Date(dueDate) < new Date() && status !== 'COMPLETED';
  }

  updateTaskStatus(taskId: string, newStatus: string): void {
    this.studentService.updateTaskStatus(taskId, newStatus).subscribe({
      next: () => {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = newStatus as any;
          this.applyFilters();
        }
      },
      error: (error) => {
        console.error('Error updating task status:', error);
      }
    });
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'INDIVIDUAL': return 'fas fa-user';
      case 'GROUP': return 'fas fa-users';
      case 'CLASS': return 'fas fa-graduation-cap';
      default: return 'fas fa-tasks';
    }
  }

  refresh(): void {
    this.loadTasks();
  }

  viewTaskDetails(taskId: string): void {
    this.studentService.getTaskDetails(taskId).subscribe({
      next: (task) => {
        console.log('Task details:', task);
        // For now, just log the details. Later we can add a modal or detailed view
        alert(`Task: ${task.title}\nDescription: ${task.description}\nStatus: ${task.status}\nDue: ${this.formatDate(task.dueDate)}`);
      },
      error: (error) => {
        console.error('Error loading task details:', error);
        alert('Failed to load task details');
      }
    });
  }

  // Template helper methods
  getCompletedTasksCount(): number {
    return this.filteredTasks.filter(t => t.status === 'COMPLETED').length;
  }

  getOverdueTasksCount(): number {
    return this.filteredTasks.filter(t => this.isOverdue(t.dueDate, t.status)).length;
  }

  getAbsoluteDays(days: number): number {
    return Math.abs(days);
  }

  // Submission methods
  canSubmitTask(task: StudentTask): boolean {
    // For testing: show submit button for all tasks except drafts
    const canSubmit = task.status !== 'DRAFT';
    
    console.log(`Task ${task.title}: status=${task.status}, type=${task.type}, canSubmit=${canSubmit}`);
    
    return canSubmit;
  }

  openSubmissionDialog(task: StudentTask): void {
    const dialogRef = this.dialog.open(SubmissionDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.submitted) {
        // Refresh tasks to show updated submission status
        this.loadTasks();
        alert('Submission completed successfully!');
      }
    });
  }
}