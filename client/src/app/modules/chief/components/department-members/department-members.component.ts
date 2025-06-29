import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../shared/services/user.service';
import { AcademicService } from '../../../../shared/services/academic.service';
import { UserSummary } from '../../../../shared/models/academic.models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-department-members',
  templateUrl: './department-members.component.html',
  styleUrls: ['./department-members.component.css']
})
export class DepartmentMembersComponent implements OnInit {
  members: UserSummary[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private readonly userService: UserService,
    private readonly academicService: AcademicService
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  async loadMembers(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      // Load students and teachers for the chief's department
      const [students, teachers] = await Promise.all([
        firstValueFrom(this.academicService.getStudentsInMyDepartment()),
        firstValueFrom(this.academicService.getTeachersInMyDepartment())
      ]);
      this.members = [...(students ?? []), ...(teachers ?? [])];
    } catch (error) {
      console.error('Error loading members:', error);
      this.error = 'Failed to load members. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
