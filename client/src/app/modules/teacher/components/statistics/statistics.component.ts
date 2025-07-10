import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';
import { RepositoryService } from '../../services/repository.service';

interface StatisticsData {
  totalProjects: number;
  totalGroups: number;
  totalStudents: number;
  totalRepositories: number;
  activeGroups: number;
  completedTasks: number;
  pendingTasks: number;
  totalCommits: number;
  recentActivity: ActivityItem[];
  groupProgress: GroupProgressItem[];
  repositoryStats: RepositoryStatsItem[];
  taskDistribution: TaskDistributionItem[];
}

interface ActivityItem {
  type: string;
  description: string;
  timestamp: Date;
  user: string;
  icon: string;
  color: string;
}

interface GroupProgressItem {
  groupName: string;
  projectName: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  memberCount: number;
  repositoryName?: string;
}

interface RepositoryStatsItem {
  name: string;
  commits: number;
  contributors: number;
  lastActivity: Date;
  language: string;
}

interface TaskDistributionItem {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {
  loading = true;
  error: string | null = null;
  
  statistics: StatisticsData = {
    totalProjects: 0,
    totalGroups: 0,
    totalStudents: 0,
    totalRepositories: 0,
    activeGroups: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalCommits: 0,
    recentActivity: [],
    groupProgress: [],
    repositoryStats: [],
    taskDistribution: []
  };

  constructor(
    private teacherDataService: TeacherDataService,
    private repositoryService: RepositoryService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading = true;
    this.error = null;

    // Load basic statistics
    Promise.all([
      this.loadProjectStatistics(),
      this.loadGroupStatistics(),
      this.loadTaskStatistics(),
      this.loadRepositoryStatistics()
    ]).then(() => {
      this.loading = false;
    }).catch(error => {
      console.error('Error loading statistics:', error);
      this.error = 'Failed to load statistics. Please try again.';
      this.loading = false;
    });
  }

  private async loadProjectStatistics(): Promise<void> {
    try {
      const projects = await this.teacherDataService.getMyProjects().toPromise();
      this.statistics.totalProjects = projects?.length || 0;

      // Calculate total students across all projects
      const allStudents = new Set();
      projects?.forEach((project: any) => {
        project.groups?.forEach((group: any) => {
          group.memberIds?.forEach((studentId: any) => allStudents.add(studentId));
        });
      });
      this.statistics.totalStudents = allStudents.size;
    } catch (error) {
      console.error('Error loading project statistics:', error);
    }
  }

  private async loadGroupStatistics(): Promise<void> {
    try {
      const projects = await this.teacherDataService.getMyProjects().toPromise();
      let totalGroups = 0;
      let activeGroups = 0;
      const groupProgress: GroupProgressItem[] = [];

      projects?.forEach((project: any) => {
        project.groups?.forEach((group: any) => {
          totalGroups++;
          activeGroups++; // Assuming all groups are active for now

          groupProgress.push({
            groupName: group.name,
            projectName: project.name,
            progress: Math.random() * 100, // Mock progress
            totalTasks: Math.floor(Math.random() * 10) + 5,
            completedTasks: Math.floor(Math.random() * 5) + 2,
            memberCount: group.memberIds?.length || 0,
            repositoryName: group.repositoryName
          });
        });
      });

      this.statistics.totalGroups = totalGroups;
      this.statistics.activeGroups = activeGroups;
      this.statistics.groupProgress = groupProgress.slice(0, 10); // Show top 10
    } catch (error) {
      console.error('Error loading group statistics:', error);
    }
  }

  private async loadTaskStatistics(): Promise<void> {
    try {
      // Mock task statistics
      const completedTasks = Math.floor(Math.random() * 50) + 20;
      const pendingTasks = Math.floor(Math.random() * 30) + 10;
      
      this.statistics.completedTasks = completedTasks;
      this.statistics.pendingTasks = pendingTasks;
      
      const total = completedTasks + pendingTasks;
      this.statistics.taskDistribution = [
        {
          status: 'Completed',
          count: completedTasks,
          percentage: (completedTasks / total) * 100,
          color: '#00b894'
        },
        {
          status: 'Pending',
          count: pendingTasks,
          percentage: (pendingTasks / total) * 100,
          color: '#fdcb6e'
        }
      ];
    } catch (error) {
      console.error('Error loading task statistics:', error);
    }
  }

  private async loadRepositoryStatistics(): Promise<void> {
    try {
      const repositories = await this.repositoryService.getTeacherRepositories().toPromise();
      this.statistics.totalRepositories = repositories?.length || 0;
      
      // Mock repository stats
      this.statistics.repositoryStats = repositories?.slice(0, 5).map(repo => ({
        name: repo.name,
        commits: Math.floor(Math.random() * 100) + 10,
        contributors: Math.floor(Math.random() * 5) + 1,
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        language: ['Java', 'TypeScript', 'Python', 'JavaScript'][Math.floor(Math.random() * 4)]
      })) || [];
      
      this.statistics.totalCommits = this.statistics.repositoryStats.reduce((sum, repo) => sum + repo.commits, 0);
    } catch (error) {
      console.error('Error loading repository statistics:', error);
    }
  }

  refresh(): void {
    this.loadStatistics();
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#00b894';
    if (progress >= 60) return '#fdcb6e';
    if (progress >= 40) return '#e17055';
    return '#d63031';
  }

  formatDate(date: Date): string {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  }
}
