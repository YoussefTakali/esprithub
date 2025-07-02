import { Component, OnInit } from '@angular/core';
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

  constructor(private readonly studentService: StudentService) {}

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

  formatDate(date: Date): string {
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
        const memberNames = group.members.map(m => `${m.firstName} ${m.lastName}`).join(', ');
        const repoInfo = group.repository ? `\nRepository: ${group.repository.name}` : '\nNo repository assigned';
        alert(`Group: ${group.name}\nProject: ${group.projectName}\nClass: ${group.className}\nMembers: ${memberNames}${repoInfo}`);
      },
      error: (error) => {
        console.error('Error loading group details:', error);
        alert('Failed to load group details');
      }
    });
  }
}
