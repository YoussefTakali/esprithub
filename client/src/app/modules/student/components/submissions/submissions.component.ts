import { Component, OnInit } from '@angular/core';
import { StudentService, StudentSubmission } from '../../services/student.service';

@Component({
  selector: 'app-student-submissions',
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.css']
})
export class StudentSubmissionsComponent implements OnInit {
  submissions: StudentSubmission[] = [];
  loading = true;
  error: string | null = null;

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.loading = true;
    this.error = null;
    
    this.studentService.getSubmissions().subscribe({
      next: (submissions) => {
        this.submissions = submissions;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading submissions:', error);
        this.error = 'Failed to load submissions. Please try again.';
        this.loading = false;
      }
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'graded': return '#28a745';
      case 'submitted': return '#17a2b8';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  }

  refresh(): void {
    this.loadSubmissions();
  }
}
