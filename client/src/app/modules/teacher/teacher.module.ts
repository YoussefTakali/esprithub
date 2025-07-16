import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatTreeModule } from '@angular/material/tree';

// Components
import { TeacherDashboardComponent } from './components/dashboard/dashboard.component';
import { StudentsComponent } from './components/students/students.component';
import { TeacherProjectsComponent } from './components/projects/projects.component';
import { TeacherTasksComponent } from './components/tasks/tasks.component';
import { RepositoriesComponent } from './components/repositories/repositories.component';
import { RepositoryDetailComponent } from './components/repository-detail/repository-detail.component';
import { CreateGroupDialogComponent } from './components/groups/create-group-dialog.component';
import { TeacherSubmissionsComponent } from './components/submissions/teacher-submissions.component';
import { TeacherSubmissionDetailModalComponent } from './components/submissions/teacher-submission-detail-modal.component';
import { EditTaskDialogModule } from './components/tasks/edit-task-dialog.module';

// Pipes
import { TimeAgoPipe } from './pipes/time-ago.pipe';

// Services
import { RepositoryService } from './services/repository.service';
import { TeacherDataService } from './services/teacher-data.service';

const routes: Routes = [
  { path: 'dashboard', component: TeacherDashboardComponent },
  { path: 'students', component: StudentsComponent },
  { path: 'projects', component: TeacherProjectsComponent },
  { path: 'tasks', component: TeacherTasksComponent },
  { path: 'repositories', component: RepositoriesComponent },
  { path: 'repositories/:owner/:name', component: RepositoryDetailComponent },
  { path: 'repository/:id', component: RepositoryDetailComponent },
  { path: 'submissions', component: TeacherSubmissionsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  declarations: [
    TeacherDashboardComponent,
    TeacherProjectsComponent,
    TeacherTasksComponent,
    RepositoriesComponent,
    RepositoryDetailComponent,
    CreateGroupDialogComponent,
    TeacherSubmissionsComponent,
    TeacherSubmissionDetailModalComponent,
    TimeAgoPipe
    ,StudentsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTabsModule,
    MatExpansionModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatListModule,
    MatStepperModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatToolbarModule,
    MatGridListModule,
    MatButtonToggleModule,
    MatSliderModule,
    MatRippleModule,
    MatBottomSheetModule,
    MatTreeModule,
    EditTaskDialogModule
  ],
  providers: [
    RepositoryService,
    TeacherDataService
  ]
})
export class TeacherModule { }
