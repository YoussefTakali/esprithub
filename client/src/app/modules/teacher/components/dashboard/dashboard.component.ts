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
  recentNotifications: any[] = [
    { id: 1, message: 'New project assigned: Web App', createdAt: new Date(), read: false, type: 'project' },
    { id: 2, message: 'Task deadline approaching: Review Group A', createdAt: new Date(Date.now() - 86400000), read: true, type: 'task' },
    { id: 3, message: 'Student John Doe submitted assignment', createdAt: new Date(Date.now() - 2 * 86400000), read: false, type: 'submission' }
  ];

  constructor(private readonly teacherData: TeacherDataService) {}

  ngOnInit() {
    this.teacherData.getMyClasses().subscribe(classes => this.myClasses = classes);
    this.teacherData.getMyProjects().subscribe(projects => this.myProjects = projects);
    this.teacherData.getMyGroups().subscribe(groups => this.myGroups = groups);
    this.teacherData.getMyTasks().subscribe(tasks => this.myTasks = tasks);
  }

  get taskCompletionRate(): number {
    if (!this.myTasks || this.myTasks.length === 0) return 0;
    const completed = this.myTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
    return Math.round((completed / this.myTasks.length) * 100);
  }
}
