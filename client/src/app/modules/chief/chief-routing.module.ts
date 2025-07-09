import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChiefDashboardComponent } from './components/chief-dashboard/chief-dashboard.component';
import { MyDepartmentComponent } from './components/my-department/my-department.component';
import { DepartmentLevelsComponent } from './components/department-levels/department-levels.component';
import { DepartmentClassesComponent } from './components/department-classes/department-classes.component';
import { DepartmentMembersComponent } from './components/department-members/department-members.component';
import { DepartmentHierarchyComponent } from './components/department-hierarchy/department-hierarchy.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: ChiefDashboardComponent },
  { path: 'department', component: MyDepartmentComponent },
  { path: 'levels', component: DepartmentLevelsComponent },
  { path: 'classes', component: DepartmentClassesComponent },
  { path: 'members', component: DepartmentMembersComponent },
  { path: 'hierarchy', component: DepartmentHierarchyComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChiefRoutingModule { }
