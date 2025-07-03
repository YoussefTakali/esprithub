import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { GitHubService, GitHubRepositoryDetails } from '../../../../services/github.service';

@Component({
  selector: 'app-github-repo-details',
  templateUrl: './github-repo-details.component.html',
  styleUrls: ['./github-repo-details.component.css']
})
export class GitHubRepoDetailsComponent implements OnInit {
  repository: GitHubRepositoryDetails | null = null;
  loading = true;
  error: string | null = null;
  selectedActivityPeriod = '30 days';
  activityPeriods = ['7 days', '30 days', '90 days'];
  activeTab = 'code'; // Default to code tab to match the images
  showCloneModal = false;
  showFileContent = false;
  showCommitDetails = false;
  selectedFile: any = null;
  selectedCommit: any = null;
  fileContent = '';
  currentPath: string[] = []; // For breadcrumb navigation
  
  // Real GitHub data properties
  dashboardStats: any = {
    totalCommits: 0,
    contributors: 0,
    totalFiles: 0,
    repositorySize: '0 KB'
  };
  
  activityStats = {
    totalCommits: 0,
    linesAdded: 0,
    linesDeleted: 0
  };
  
  fileTypes: any[] = [];
  repositoryFiles: any[] = [];
  contributors: any[] = [];
  latestCommit: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studentService: StudentService,
    private readonly githubService: GitHubService
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

    // Use the StudentService to fetch individual repository GitHub details
    this.studentService.getRepositoryGitHubDetails(repoId).subscribe({
      next: (githubData: any) => {
        console.log('Received GitHub repository details:', githubData);
        console.log('Repository name:', githubData.name);
        console.log('Repository fullName:', githubData.fullName);
        console.log('Repository owner:', githubData.owner);
        
        this.repository = githubData;
        this.processGitHubData(githubData);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repository details:', error);
        this.error = 'Failed to load repository details. Please try again.';
        this.loading = false;
      }
    });
  }

  private processGitHubData(data: any): void {
    // Update dashboard stats with real GitHub data
    this.dashboardStats = {
      totalCommits: data.recentCommits?.length ?? 0,
      contributors: data.contributors?.length ?? 0,
      totalFiles: data.files?.length ?? 0,
      repositorySize: this.formatRepositorySize(data.size ?? 0)
    };

    // Process contributors
    this.contributors = data.contributors?.map((contributor: any) => ({
      name: contributor.login,
      commits: contributor.contributions,
      avatar: contributor.avatarUrl,
      url: contributor.htmlUrl
    })) ?? [];

    // Process latest commit
    if (data.recentCommits && data.recentCommits.length > 0) {
      const latestCommit = data.recentCommits[0];
      this.latestCommit = {
        message: latestCommit.message,
        author: latestCommit.authorName,
        date: this.formatDate(latestCommit.date),
        sha: latestCommit.sha.substring(0, 7), // Short SHA
        url: latestCommit.htmlUrl
      };
    }

    // Process files for code view
    this.repositoryFiles = data.files?.map((file: any) => ({
      name: file.name,
      type: file.type,
      size: this.formatFileSize(file.size ?? 0),
      lastModified: file.lastModified ? this.formatDate(file.lastModified) : 'Unknown',
      message: file.lastCommitMessage ?? 'No commit message',
      committer: file.lastCommitAuthor ?? 'Unknown',
      path: file.path,
      downloadUrl: file.downloadUrl,
      htmlUrl: file.htmlUrl
    })) ?? [];

    // Process languages for file types
    this.processLanguages(data.languages ?? {});

    // Update activity stats
    this.activityStats = {
      totalCommits: data.recentCommits?.length ?? 0,
      linesAdded: 0, // This would need to be calculated from commit data
      linesDeleted: 0 // This would need to be calculated from commit data
    };
  }

  private formatRepositorySize(sizeInKB: number): string {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`;
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(1)} MB`;
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`;
    }
  }

  private formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  private processLanguages(languages: { [key: string]: number }): void {
    const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
    
    if (total === 0) {
      this.fileTypes = [];
      return;
    }

    // Define colors for common languages
    const languageColors: { [key: string]: string } = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#3178c6',
      'Python': '#3776ab',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C': '#555555',
      'HTML': '#e34c26',
      'CSS': '#1572b6',
      'PHP': '#4f5d95',
      'Ruby': '#701516',
      'Go': '#00add8',
      'Rust': '#dea584',
      'Swift': '#fa7343',
      'Kotlin': '#a97bff',
      'Dart': '#00b4ab',
      'C#': '#239120',
      'Shell': '#89e051',
      'PowerShell': '#012456',
      'Dockerfile': '#384d54',
      'JSON': '#292929',
      'YAML': '#cb171e',
      'Markdown': '#083fa1'
    };

    this.fileTypes = Object.entries(languages)
      .map(([language, bytes]) => ({
        type: language.toLowerCase(),
        name: language,
        percentage: Math.round((bytes / total) * 100),
        color: languageColors[language] || '#6c757d',
        size: this.formatFileSize(bytes)
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10); // Show top 10 languages
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

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleCloneModal(): void {
    this.showCloneModal = !this.showCloneModal;
  }

  closeCloneModal(): void {
    this.showCloneModal = false;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
      // You could show a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  downloadZip(): void {
    // Implement download ZIP functionality
    console.log('Downloading ZIP...');
  }

  getFileIcon(type: string): string {
    return type === 'folder' ? 'fas fa-folder' : 'fas fa-file';
  }

  getFileIconColor(fileName: string, type: string): string {
    if (type === 'folder') return '#79b8ff';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    const colors: { [key: string]: string } = {
      'md': '#083fa1',
      'json': '#f1e05a',
      'html': '#e34c26',
      'css': '#563d7c',
      'js': '#f1e05a',
      'ts': '#2b7489',
      'py': '#3572a5',
      'txt': '#6c757d',
      'jpg': '#f39c12',
      'png': '#f39c12',
      'gitignore': '#6c757d',
      'gitattributes': '#6c757d',
      'csv': '#2b7489'
    };
    return colors[extension ?? ''] ?? '#6c757d';
  }

  // File navigation methods
  onFileClick(file: any): void {
    if (file.type === 'folder') {
      // Navigate into folder
      this.currentPath.push(file.name);
      // In a real implementation, you would load the folder contents
    } else {
      // Open file content view
      this.selectedFile = file;
      this.showFileContent = true;
      this.loadFileContent(file);
    }
  }

  loadFileContent(file: any): void {
    // Mock file content based on file type
    const mockContent = this.getMockFileContent(file.name);
    this.fileContent = mockContent;
  }

  getMockFileContent(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'py':
        return `# Python File: ${fileName}
def hello_world():
    print("Hello, World!")
    return "Hello from ${fileName}"

if __name__ == "__main__":
    hello_world()
`;
      case 'txt':
        return `This is a text file: ${fileName}

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation.
`;
      case 'css':
        return `/* CSS File: ${fileName} */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    background-color: #333;
    color: white;
    padding: 1rem;
}
`;
      case 'gitignore':
        return `# Git ignore file
node_modules/
dist/
.env
*.log
.DS_Store
target/
`;
      case 'gitattributes':
        return `# Git attributes file
* text=auto
*.jpg binary
*.png binary
*.pdf binary
`;
      case 'jpg':
        return `# Image File Preview
File: ${fileName}
Type: JPEG Image
Size: 24 KB

This is a binary image file. 
You can download it to view the content.

Log Information:
2025-05-10T11:38:26.242+01:00  INFO 12046 --- [cyer1] [nio-8087-exec-4] o.s.web.servlet.DispatcherServlet
2025-05-10T11:38:26.243+01:00  INFO 12046 --- [cyer1] [nio-8087-exec-4] o.s.web.servlet.DispatcherServlet
2025-05-10T11:38:26.277+01:00  INFO 12046 --- [cyer1] [nio-8087-exec-4] t.e.f.controllers.aspects.LoggingAspect
`;
      default:
        return `Content of ${fileName}

This is a sample file content.
In a real implementation, this would be loaded from the repository.
`;
    }
  }

  closeFileView(): void {
    this.showFileContent = false;
    this.selectedFile = null;
    this.fileContent = '';
  }

  navigateToPath(index: number): void {
    // Remove path segments after the clicked index
    this.currentPath = this.currentPath.slice(0, index + 1);
    // In a real implementation, reload the directory contents
  }

  navigateToRoot(): void {
    this.currentPath = [];
    // In a real implementation, reload the root directory contents
  }

  // Commit details methods
  showCommitDetailsView(commit: any): void {
    this.selectedCommit = commit;
    this.showCommitDetails = true;
  }

  closeCommitDetails(): void {
    this.showCommitDetails = false;
    this.selectedCommit = null;
  }

  // Mock commit details
  getCommitDetails() {
    return {
      sha: '24f1417',
      message: 'Replace actualiser.png (updated)',
      author: 'salmabm',
      date: '27 days ago',
      changes: [
        {
          file: 'actualiser.png',
          type: 'modified',
          additions: 0,
          deletions: 0,
          isBinary: true
        },
        {
          file: 'src/main.py',
          type: 'modified',
          additions: 15,
          deletions: 3,
          isBinary: false,
          diff: `@@ -10,7 +10,10 @@ def main():
 def process_data():
-    data = load_data()
-    return process(data)
+    try:
+        data = load_data()
+        return process(data)
+    except Exception as e:
+        print(f"Error processing data: {e}")
+        return None
 
 if __name__ == "__main__":`
        }
      ],
      stats: {
        additions: 15,
        deletions: 3,
        changedFiles: 2
      }
    };
  }
}
