import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../shared/services/user.service';
import { User } from '../../../../shared/models/academic.models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-department-members',
  templateUrl: './department-members.component.html',
  styleUrls: ['./department-members.component.css']
})
export class DepartmentMembersComponent implements OnInit {
  members: User[] = [];
  loading = true;
  error: string | null = null;

  constructor(private readonly userService: UserService) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  async loadMembers(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      // Load members for the chief's department
      const users = await firstValueFrom(this.userService.getAllUsers());
      this.members = users ?? [];
    } catch (error) {
      console.error('Error loading members:', error);
      this.error = 'Failed to load members. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
