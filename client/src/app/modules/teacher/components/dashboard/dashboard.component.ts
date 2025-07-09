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

  constructor(private readonly teacherData: TeacherDataService) {}

  ngOnInit() {
    this.teacherData.getMyClasses().subscribe(classes => this.myClasses = classes);
    this.teacherData.getMyProjects().subscribe(projects => this.myProjects = projects);
    this.teacherData.getMyGroups().subscribe(groups => this.myGroups = groups);
    this.teacherData.getMyTasks().subscribe(tasks => this.myTasks = tasks);
  }
}
