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
  activeTab = 'code'; // Default to code tab to match the images
  showCloneModal = false;
  showFileContent = false;
  showCommitDetails = false;
  selectedFile: any = null;
  selectedCommit: any = null;
  fileContent = '';
  currentPath: string[] = []; // For breadcrumb navigation
  
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
    { type: 'jpg', percentage: 61, color: '#f1e05a', size: '2 files' },
    { type: 'css', percentage: 30, color: '#563d7c', size: '1 file' },
    { type: 'gitignore', percentage: 30, color: '#6c757d', size: '1 file' },
    { type: 'csv', percentage: 31, color: '#2b7489', size: '3 files' }
  ];

  // Mock file data for code view - matching the real repository structure from images
  repositoryFiles = [
    { name: 'actualiser.png', type: 'file', size: '24 KB', lastModified: '27 days ago', message: 'Replace actualiser.png (updated)', committer: 'salmabm' },
    { name: 'editorconfig.txt', type: 'file', size: '24 KB', lastModified: '1 month ago', message: 'Replace icons8-facebook-nouveau-48.png (created)', committer: 'salmabm' },
    { name: 'icons8-facebook-nouveau-48.png', type: 'file', size: '24 KB', lastModified: '1 month ago', message: 'test_push1 (created)', committer: 'salmabm' },
    { name: 'esp_.png', type: 'file', size: '24 KB', lastModified: '1 month ago', message: 'test_push_1', committer: 'salmabm' },
    { name: 'Loading files...', type: 'file', size: '', lastModified: '1 month ago', message: 'test_push', committer: 'salmabm' },
    { name: 'Loading files...', type: 'file', size: '', lastModified: '1 month ago', message: 'hnh', committer: 'salmabm' },
    { name: 'Loading files...', type: 'file', size: '', lastModified: '1 month ago', message: 'bgbg', committer: 'salmabm' },
    { name: 'Loading files...', type: 'file', size: '', lastModified: '1 month ago', message: 'bgbg', committer: 'salmabm' },
    { name: '1.jpg', type: 'file', size: '24 KB', lastModified: '1 month ago', message: 'bgbg', committer: 'salmabm' }
  ];

  // Contributors data
  contributors = [
    { name: 'salmabm', commits: 22, avatar: 'assets/avatar1.png' },
    { name: 'salmabenmiled', commits: 16, avatar: 'assets/avatar2.png' }
  ];

  // Latest commit info
  latestCommit = {
    message: 'Replace actualiser.png (updated)',
    author: 'salmabm',
    date: '27 days ago',
    sha: '24f1417'
  };

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
            totalCommits: repository.stats.commits ?? this.dashboardStats.totalCommits,
            contributors: repository.contributors?.length ?? this.dashboardStats.contributors,
            totalFiles: repository.stats.files ?? this.dashboardStats.totalFiles,
            repositorySize: repository.stats.size ?? this.dashboardStats.repositorySize
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
