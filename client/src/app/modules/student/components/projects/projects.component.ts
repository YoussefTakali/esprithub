import { Component, OnInit } from '@angular/core';
import { StudentService, StudentProject } from '../../services/student.service';

@Component({
  selector: 'app-student-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class StudentProjectsComponent implements OnInit {
  projects: StudentProject[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  filteredProjects: StudentProject[] = [];
  selectedProject: StudentProject | null = null;
  showDetails = false;

  constructor(private readonly studentService: StudentService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.error = null;
    
    this.studentService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.error = 'Failed to load projects. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.projects];

    if (this.searchTerm) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => 
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
    this.filteredProjects = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }



getDaysUntilDeadline(deadline: string | Date): number {
  // Convert to Date if it's a string
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

formatDate(date: string | Date): string {
  // Convert to Date if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

  isOverdue(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  refresh(): void {
    this.loadProjects();
  }

  viewProjectDetails(projectId: string): void {
    this.studentService.getProjectDetails(projectId).subscribe({
      next: (project) => {
        console.log('Project details:', project);
        this.selectedProject = project;
        this.showDetails = true;
      },
      error: (error) => {
        console.error('Error loading project details:', error);
        alert('Failed to load project details');
      }
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedProject = null;
  }
}
