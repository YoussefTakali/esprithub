import { Component, OnInit } from '@angular/core';
import { TeacherDataService } from '../../services/teacher-data.service';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class TeacherDashboardComponent implements OnInit {
  myClasses: any[] = [];
  myProjects: any[] = [];
  myGroups: any[] = [];
  myTasks: any[] = [];
  myStudents: any[] = [];
  myRepositories: any[] = [];

  recentNotifications: any[] = [
    { id: 1, message: 'New project assigned: Web App', createdAt: new Date(), read: false, type: 'project' },
    { id: 2, message: 'Task deadline approaching: Review Group A', createdAt: new Date(Date.now() - 86400000), read: true, type: 'task' },
    { id: 3, message: 'Student John Doe submitted assignment', createdAt: new Date(Date.now() - 2 * 86400000), read: false, type: 'submission' }
  ];

  dashboard: any = null;
  loading = true;
  error: string | null = null;
  now = new Date();

  // Statistiques avancées fusionnées de StatisticsComponent
  statistics: {
    totalProjects: number;
    totalGroups: number;
    totalStudents: number;
    totalRepositories: number;
    activeGroups: number;
    completedTasks: number;
    pendingTasks: number;
    totalCommits: number;
    groupProgress: any[];
    repositoryStats: any[];
    taskDistribution: any[];
  } = {
    totalProjects: 0,
    totalGroups: 0,
    totalStudents: 0,
    totalRepositories: 0,
    activeGroups: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalCommits: 0,
    groupProgress: [],
    repositoryStats: [],
    taskDistribution: []
  };


  constructor(private readonly teacherData: TeacherDataService) {}

  ngOnInit() {
    this.teacherData.getMyClasses().subscribe(classes => this.myClasses = classes);
    this.teacherData.getMyProjects().subscribe(projects => this.myProjects = projects);
    this.teacherData.getMyGroups().subscribe(groups => this.myGroups = groups);
    this.teacherData.getMyTasks().subscribe(tasks => this.myTasks = tasks);
    this.teacherData.getMyStudents().subscribe(students => this.myStudents = students);
    this.teacherData.getMyRepositories().subscribe(repos => this.myRepositories = repos);
    this.loadAdvancedStatistics();
    this.teacherData.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      }
    });
  }

  async loadAdvancedStatistics() {
    // Projects & Students
    const projects = await this.teacherData.getMyProjects().toPromise();
    this.statistics.totalProjects = projects?.length || 0;
    const allStudents = new Set();
    projects?.forEach((project: any) => {
      project.groups?.forEach((group: any) => {
        group.memberIds?.forEach((studentId: any) => allStudents.add(studentId));
      });
    });
    this.statistics.totalStudents = allStudents.size;

    // Groups
    let totalGroups = 0;
    let activeGroups = 0;
    const groupProgress: any[] = [];
    projects?.forEach((project: any) => {
      project.groups?.forEach((group: any) => {
        totalGroups++;
        activeGroups++;
        // Calcul dynamique de la progression
        const totalTasks = group.totalTasks ?? (group.tasks ? group.tasks.length : 0);
        const completedTasks = group.completedTasks ?? (group.tasks ? group.tasks.filter((t: any) => t.status === 'COMPLETED').length : 0);
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        groupProgress.push({
          groupName: group.name,
          projectName: project.name,
          progress,
          totalTasks,
          completedTasks,
          memberCount: group.memberIds?.length || 0,
          repositoryName: group.repositoryName
        });
      });
    });
    this.statistics.totalGroups = totalGroups;
    this.statistics.activeGroups = activeGroups;
    this.statistics.groupProgress = groupProgress.slice(0, 10);

    // Tasks (dynamique)
    let completedTasks = 0;
    let pendingTasks = 0;
    projects?.forEach((project: any) => {
      project.groups?.forEach((group: any) => {
        group.tasks?.forEach((task: any) => {
          if (task.status === 'COMPLETED') completedTasks++;
          else pendingTasks++;
        });
      });
    });
    this.statistics.completedTasks = completedTasks;
    this.statistics.pendingTasks = pendingTasks;
    const total = completedTasks + pendingTasks;
    this.statistics.taskDistribution = [
      {
        status: 'Completed',
        count: completedTasks,
        percentage: total > 0 ? (completedTasks / total) * 100 : 0,
        color: '#a71617' // main red
      },
      {
        status: 'Pending',
        count: pendingTasks,
        percentage: total > 0 ? (pendingTasks / total) * 100 : 0,
        color: '#f8b940' // gold
      }
    ];

    // Repositories (dynamique)
    const repositories = await this.teacherData.getMyRepositories().toPromise();
    this.statistics.totalRepositories = repositories?.length || 0;
    this.statistics.repositoryStats = repositories?.slice(0, 5).map(repo => ({
      name: repo.name,
      commits: repo.commitCount ?? 0,
      contributors: repo.contributors ?? 0,
      lastActivity: repo.lastActivity ?? '',
      language: repo.language ?? ''
    })) || [];
    this.statistics.totalCommits = this.statistics.repositoryStats.reduce((sum, repo) => sum + repo.commits, 0);
  }

  isOverdue(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline) < this.now;
  }

  get taskCompletionRate(): number {
    if (!this.myTasks || this.myTasks.length === 0) return 0;
    const completed = this.myTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
    return Math.round((completed / this.myTasks.length) * 100);
  }

  get totalCommits(): number {
    if (!this.myRepositories || this.myRepositories.length === 0) return 0;
    return this.myRepositories.reduce((sum, repo) => sum + (repo.commitCount || 0), 0);
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#a71617'; // main red
    if (progress >= 60) return '#c41e3a'; // secondary red
    if (progress >= 40) return '#f8b940'; // gold
    return '#e0e0e0'; // light gray
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
