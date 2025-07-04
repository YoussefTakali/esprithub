import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StudentService, StudentGroup } from '../../services/student.service';

@Component({
  selector: 'app-student-groups',
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css']
})
export class StudentGroupsComponent implements OnInit {
  groups: StudentGroup[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  filteredGroups: StudentGroup[] = [];
  selectedGroup: StudentGroup | null = null;
  showDetails = false;

  constructor(
    private readonly studentService: StudentService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    this.error = null;
    
    this.studentService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.error = 'Failed to load groups. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.groups];

    if (this.searchTerm) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        group.projectName.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredGroups = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  refresh(): void {
    this.loadGroups();
  }

  viewGroupDetails(groupId: string): void {
    this.studentService.getGroupDetails(groupId).subscribe({
      next: (group) => {
        console.log('Group details:', group);
        this.selectedGroup = group;
        this.showDetails = true;
      },
      error: (error) => {
        console.error('Error loading group details:', error);
        this.error = 'Failed to load group details';
      }
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedGroup = null;
  }

  navigateToRepository(repositoryId: string | null): void {
    if (repositoryId) {
      this.router.navigate(['/student/repositories', repositoryId]);
    } else {
      console.warn('No repository ID provided');
    }
  }

  openRepositoryUrl(url: string | null): void {
    if (url) {
      window.open(url, '_blank');
    } else {
      console.warn('No repository URL provided');
    }
  }
}
