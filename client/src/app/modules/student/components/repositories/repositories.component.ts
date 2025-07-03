import { Component, OnInit } from '@angular/core';
import { StudentService, Repository } from '../../services/student.service';

@Component({
  selector: 'app-student-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.css']
})
export class StudentRepositoriesComponent implements OnInit {
  repositories: Repository[] = [];
  loading = true;
  error: string | null = null;

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.loadRepositories();
  }

  loadRepositories(): void {
    this.loading = true;
    this.error = null;
    
    this.studentService.getAllGitHubRepositories().subscribe({
      next: (repositories) => {
        console.log('Loaded GitHub repositories:', repositories);
        this.repositories = repositories;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading GitHub repositories:', error);
        this.error = 'Failed to load repositories. Please try again.';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadRepositories();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }
}
