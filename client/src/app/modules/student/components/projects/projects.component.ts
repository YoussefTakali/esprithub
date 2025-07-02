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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getDaysUntilDeadline(deadline: Date): number {
    const now = new Date();
    const due = new Date(deadline);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  isOverdue(deadline: Date): boolean {
    return new Date(deadline) < new Date();
  }

  refresh(): void {
    this.loadProjects();
  }

  viewProjectDetails(projectId: string): void {
    this.studentService.getProjectDetails(projectId).subscribe({
      next: (project) => {
        console.log('Project details:', project);
        const groupNames = project.groups.map(g => g.name).join(', ');
        const taskCount = project.tasks.length;
        const collaboratorNames = project.collaborators.map(c => `${c.firstName} ${c.lastName}`).join(', ');
        alert(`Project: ${project.name}\nDescription: ${project.description}\nGroups: ${groupNames}\nTasks: ${taskCount}\nCollaborators: ${collaboratorNames}\nDeadline: ${this.formatDate(project.deadline)}`);
      },
      error: (error) => {
        console.error('Error loading project details:', error);
        alert('Failed to load project details');
      }
    });
  }
}
