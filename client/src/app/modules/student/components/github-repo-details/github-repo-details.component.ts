import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';

@Component({
  selector: 'app-github-repo-details',
  templateUrl: './github-repo-details.component.html',
  styleUrls: ['./github-repo-details.component.css']
})
export class GitHubRepoDetailsComponent implements OnInit {
  repository: any = null;
  loading = true;
  error: string | null = null;
  selectedActivityPeriod = '30 days';
  activityPeriods = ['7 days', '30 days', '90 days'];
  
  // Mock data for demonstration - replace with real data from API
  dashboardStats = {
    totalCommits: 1,
    contributors: 2,
    totalFiles: 5,
    repositorySize: '2.1 MB'
  };
  
  activityStats = {
    totalCommits: 1,
    linesAdded: 57,
    linesDeleted: 25
  };
  
  fileTypes = [
    { type: 'JavaScript', percentage: 45, color: '#f1e05a' },
    { type: 'TypeScript', percentage: 30, color: '#2b7489' },
    { type: 'HTML', percentage: 15, color: '#e34c26' },
    { type: 'CSS', percentage: 10, color: '#563d7c' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const repoId = params['id'];
      if (repoId) {
        this.loadRepositoryDetails(repoId);
      } else {
        this.error = 'Repository ID not provided';
        this.loading = false;
      }
    });
  }

  loadRepositoryDetails(repoId: string): void {
    this.loading = true;
    this.error = null;

    this.studentService.getRepositoryDetails(repoId).subscribe({
      next: (repository) => {
        this.repository = repository;
        // Update dashboard stats with real data if available
        if (repository.stats) {
          this.dashboardStats = {
            totalCommits: repository.stats.commits || this.dashboardStats.totalCommits,
            contributors: repository.contributors?.length || this.dashboardStats.contributors,
            totalFiles: repository.stats.files || this.dashboardStats.totalFiles,
            repositorySize: repository.stats.size || this.dashboardStats.repositorySize
          };
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repository details:', error);
        this.error = 'Failed to load repository details. Please try again.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/student/repositories']);
  }

  onActivityPeriodChange(period: string): void {
    this.selectedActivityPeriod = period;
    // Here you would typically reload activity data for the selected period
  }

  refreshData(): void {
    if (this.repository) {
      this.loadRepositoryDetails(this.repository.id);
    }
  }
}
