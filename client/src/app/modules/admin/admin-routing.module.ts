import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ClassManagementComponent } from './components/class-management/class-management.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { DepartmentManagementComponent } from './components/department-management/department-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { UserDetailsComponent } from './components/user-details/user-details.component';
import { RepositoryBrowserComponent } from './components/repository-browser/repository-browser.component';
import { RepositoryManagementComponent } from './components/repository-management/repository-management.component';
import { LevelManagementComponent } from './components/level-management/level-management.component';
import { CourseManagementComponent } from './components/course-management/course-management.component';
import { HierarchicalViewComponent } from './components/hierarchical-view/hierarchical-view.component';

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
    path: 'users/:id',
    component: UserDetailsComponent
  },
  {
    path: 'repositories',
    component: RepositoryManagementComponent
  },
  {
    path: 'repositories/:id',
    component: RepositoryBrowserComponent
  },
  {
    path: 'levels',
    component: LevelManagementComponent
  },
  {
    path: 'classes',
    component: ClassManagementComponent
  },
  {
    path: 'courses',
    component: CourseManagementComponent
  },
  {
    path: 'hierarchy',
    component: HierarchicalViewComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
