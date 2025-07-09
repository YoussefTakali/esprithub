import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { GitHubCallbackComponent } from './components/auth/github-callback/github-callback.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AiCodeReviewComponent } from './components/ai-code-review/ai-code-review.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'ai-code-review', component: AiCodeReviewComponent },
      { 
        path: 'admin', 
        loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule)
      },
      { 
        path: 'chief', 
        loadChildren: () => import('./modules/chief/chief.module').then(m => m.ChiefModule)
      },
      { 
        path: 'teacher',
        loadChildren: () => import('./modules/teacher/teacher.module').then(m => m.TeacherModule)
      },
      { 
        path: 'student',
        loadChildren: () => import('./modules/student/student.module').then(m => m.StudentModule)
      },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'auth/github/callback', component: GitHubCallbackComponent }
    ]
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
