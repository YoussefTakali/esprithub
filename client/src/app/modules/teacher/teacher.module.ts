import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TeacherDashboardComponent } from './components/dashboard/dashboard.component';
import { TeacherTasksComponent } from './components/tasks/tasks.component';
import { TeacherProjectsComponent } from './components/projects/projects.component';

const routes: Routes = [
  { path: 'dashboard', component: TeacherDashboardComponent },
  { path: 'tasks', component: TeacherTasksComponent },
  { path: 'projects', component: TeacherProjectsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  declarations: [
    TeacherDashboardComponent,
    TeacherTasksComponent,
    TeacherProjectsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TeacherModule { }
