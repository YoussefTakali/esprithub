import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ChiefRoutingModule } from './chief-routing.module';
import { ChiefDashboardComponent } from './components/chief-dashboard/chief-dashboard.component';
import { MyDepartmentComponent } from './components/my-department/my-department.component';
import { DepartmentLevelsComponent } from './components/department-levels/department-levels.component';
import { DepartmentClassesComponent } from './components/department-classes/department-classes.component';
import { DepartmentMembersComponent } from './components/department-members/department-members.component';

@NgModule({
  declarations: [
    ChiefDashboardComponent,
    MyDepartmentComponent,
    DepartmentLevelsComponent,
    DepartmentClassesComponent,
    DepartmentMembersComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ChiefRoutingModule
  ]
})
export class ChiefModule { }
