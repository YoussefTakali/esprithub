import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
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
import { TeacherDashboardComponent } from './components/dashboard/dashboard.component';
import { TeacherTasksComponent } from './components/tasks/tasks.component';
import { TeacherProjectsComponent } from './components/projects/projects.component';
import { RepositoriesComponent } from './components/repositories/repositories.component';
import { RepositoryDetailComponent } from './components/repository-detail/repository-detail.component';
import { CreateGroupDialogComponent } from './components/groups/create-group-dialog.component';
import { EditTaskDialogModule } from './components/tasks/edit-task-dialog.module';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { RepositoryService } from './services/repository.service';
import { TimeAgoPipe } from './pipes/time-ago.pipe';

const routes: Routes = [
  { path: 'dashboard', component: TeacherDashboardComponent },
  { path: 'tasks', component: TeacherTasksComponent },
  { path: 'projects', component: TeacherProjectsComponent },
  { path: 'repositories', component: RepositoriesComponent },
  { path: 'repositories/:owner/:name', component: RepositoryDetailComponent },
  { path: 'statistics', component: StatisticsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  declarations: [
    TeacherDashboardComponent,
    TeacherTasksComponent,
    TeacherProjectsComponent,
    RepositoriesComponent,
    RepositoryDetailComponent,
    CreateGroupDialogComponent,
    StatisticsComponent,
    TimeAgoPipe
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
    MatProgressBarModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatTooltipModule,
    MatRadioModule,
    EditTaskDialogModule
  ],
  providers: [
    RepositoryService
  ]
})
export class TeacherModule { }
