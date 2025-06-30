import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TeacherDashboardComponent } from './components/dashboard/dashboard.component';
import { TeacherTasksComponent } from './components/tasks/tasks.component';
import { TeacherProjectsComponent } from './components/projects/projects.component';
import { CreateGroupDialogComponent } from './components/groups/create-group-dialog.component';
import { EditTaskDialogModule } from './components/tasks/edit-task-dialog.module';

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
    TeacherProjectsComponent,
    CreateGroupDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    EditTaskDialogModule
  ]
})
export class TeacherModule { }
