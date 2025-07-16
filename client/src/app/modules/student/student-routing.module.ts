import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskSubmissionComponent } from './components/tasks/task-submission.component';
import { SubmitTaskComponent } from './components/tasks/submit-task.component';
import { StudentSubmissionsComponent } from './components/submissions/submissions.component';
import { StudentProjectsComponent } from './components/projects/projects.component';
import { StudentDashboardComponent } from './components/dashboard/dashboard.component';
import { StudentGroupsComponent } from './components/groups/groups.component';
import { StudentRepositoriesComponent } from './components/repositories/repositories.component';
import { GitHubRepoDetailsComponent } from './components/github-repo-details/github-repo-details.component';
import { StudentScheduleComponent } from './components/schedule/schedule.component';
import { StudentTasksComponent } from './components/tasks/tasks.component';
import { CommitHistoryComponent } from './components/commit-history/commit-history.component';
const routes: Routes = [
  { path: '', redirectTo: '/student/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: StudentDashboardComponent },
  { path: 'projects', component: StudentProjectsComponent },
  { path: 'groups', component: StudentGroupsComponent },
  { path: 'repositories', component: StudentRepositoriesComponent },
  { path: 'repositories/:id', component: GitHubRepoDetailsComponent },
  { path: 'schedule', component: StudentScheduleComponent },
  { path: 'tasks', component: StudentTasksComponent },
  { path: 'tasks/:taskId/submit', component: SubmitTaskComponent },
  { path: 'submissions', component: StudentSubmissionsComponent },
{ path: 'repositories/:id/commits', component: CommitHistoryComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule { }
