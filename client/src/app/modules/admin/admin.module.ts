import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DepartmentManagementComponent } from './components/department-management/department-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { LevelManagementComponent } from './components/level-management/level-management.component';
import { ClassManagementComponent } from './components/class-management/class-management.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    DepartmentManagementComponent,
    UserManagementComponent,
    LevelManagementComponent,
    ClassManagementComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
