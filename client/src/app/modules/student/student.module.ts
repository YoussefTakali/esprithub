import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
 
// Angular Material Modules
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
 
// Student Components
import { StudentDashboardComponent } from './components/dashboard/dashboard.component';
import { StudentTasksComponent } from './components/tasks/tasks.component';
import { StudentProjectsComponent } from './components/projects/projects.component';
import { StudentGroupsComponent } from './components/groups/groups.component';
import { StudentSubmissionsComponent } from './components/submissions/submissions.component';
import { StudentRepositoriesComponent } from './components/repositories/repositories.component';
import { StudentScheduleComponent } from './components/schedule/schedule.component';
import { GitHubRepoDetailsComponent } from './components/github-repo-details/github-repo-details.component';
import { CommitHistoryComponent } from './components/commit-history/commit-history.component';
import { StudentService } from './services/student.service';
 
const routes: Routes = [
  { path: 'dashboard', component: StudentDashboardComponent },
  { path: 'tasks', component: StudentTasksComponent },
  { path: 'projects', component: StudentProjectsComponent },
  { path: 'groups', component: StudentGroupsComponent },
  { path: 'submissions', component: StudentSubmissionsComponent },
  { path: 'repositories', component: StudentRepositoriesComponent },
  { path: 'repositories/:id', component: GitHubRepoDetailsComponent },
  { path: 'repositories/:id/commits', component: CommitHistoryComponent },
  { path: 'schedule', component: StudentScheduleComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
 
@NgModule({
  declarations: [
    StudentDashboardComponent,
    StudentTasksComponent,
    StudentProjectsComponent,
    StudentGroupsComponent,
    StudentSubmissionsComponent,
    StudentRepositoriesComponent,
    StudentScheduleComponent,
    GitHubRepoDetailsComponent,
    CommitHistoryComponent,
    CommitHistoryComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
   
    // Angular Material
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatTabsModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    MatExpansionModule,
    MatChipsModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    StudentService
  ],
  exports: [
    StudentDashboardComponent,
    StudentTasksComponent,
    StudentProjectsComponent,
    StudentGroupsComponent,
    StudentSubmissionsComponent,
    StudentRepositoriesComponent,
    StudentScheduleComponent
  ]
})
export class StudentModule { }
 
 