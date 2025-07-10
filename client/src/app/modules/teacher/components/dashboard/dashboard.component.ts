import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit {
  myClasses: any[] = [];
  myProjects: any[] = [];
  myGroups: any[] = [];
  myTasks: any[] = [];
  dashboard: any = null;
  loading = true;
  error: string | null = null;
  now = new Date();

  constructor(private readonly teacherData: TeacherDataService) {}

  ngOnInit() {
    this.teacherData.getMyClasses().subscribe(classes => this.myClasses = classes);
    this.teacherData.getMyProjects().subscribe(projects => this.myProjects = projects);
    this.teacherData.getMyGroups().subscribe(groups => this.myGroups = groups);
    this.teacherData.getMyTasks().subscribe(tasks => this.myTasks = tasks);
    this.teacherData.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      }
    });
  }

  isOverdue(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline) < this.now;
  }
}
