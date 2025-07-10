import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DepartmentManagementComponent } from './components/department-management/department-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { UserDetailsComponent } from './components/user-details/user-details.component';
import { RepositoryBrowserComponent } from './components/repository-browser/repository-browser.component';
import { RepositoryManagementComponent } from './components/repository-management/repository-management.component';
import { LevelManagementComponent } from './components/level-management/level-management.component';
import { ClassManagementComponent } from './components/class-management/class-management.component';
import { CourseManagementComponent } from './components/course-management/course-management.component';
import { CourseCreateDialogComponent } from './components/course-management/course-create-dialog.component';
import { AssignStudentsDialogComponent } from './components/class-management/assign-students-dialog.component';
import { HierarchicalViewComponent } from './components/hierarchical-view/hierarchical-view.component';
import { ShowAllStudentsDialogComponent } from './components/class-management/show-all-students-dialog.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    DepartmentManagementComponent,
    UserManagementComponent,
    UserDetailsComponent,
    RepositoryBrowserComponent,
    RepositoryManagementComponent,
    LevelManagementComponent,
    ClassManagementComponent,
    CourseManagementComponent,
    CourseCreateDialogComponent,
    AssignStudentsDialogComponent,
    HierarchicalViewComponent,
    ShowAllStudentsDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    AdminRoutingModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class AdminModule { }
