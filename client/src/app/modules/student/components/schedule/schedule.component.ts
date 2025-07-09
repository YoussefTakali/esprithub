import { Component, OnInit } from '@angular/core';
import { StudentService, StudentSchedule } from '../../services/student.service';

@Component({
  selector: 'app-student-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class StudentScheduleComponent implements OnInit {
  schedule: StudentSchedule | null = null;
  loading = true;
  error: string | null = null;

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.loadSchedule();
  }

  loadSchedule(): void {
    this.loading = true;
    this.error = null;
    
    this.studentService.getSchedule().subscribe({ 
      next: (schedule) => {
        this.schedule = schedule;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading schedule:', error);
        this.error = 'Failed to load schedule. Please try again.';
        this.loading = false;
      }
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'task': return 'fas fa-tasks';
      case 'project': return 'fas fa-folder-open';
      case 'deadline': return 'fas fa-clock';
      case 'event': return 'fas fa-calendar-alt';
      default: return 'fas fa-calendar';
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'task': return '#a71617';
      case 'project': return '#28a745';
      case 'deadline': return '#ffc107';
      case 'event': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  refresh(): void {
    this.loadSchedule();
  }
}
