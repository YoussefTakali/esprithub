import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ClassManagementComponent } from './components/class-management/class-management.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DepartmentManagementComponent } from './components/department-management/department-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { LevelManagementComponent } from './components/level-management/level-management.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: AdminDashboardComponent
  },
  {
    path: 'departments',
    component: DepartmentManagementComponent
  },
  {
    path: 'users',
    component: UserManagementComponent
  },
  {
    path: 'levels',
    component: LevelManagementComponent
  },
  {
    path: 'classes',
    component: ClassManagementComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
