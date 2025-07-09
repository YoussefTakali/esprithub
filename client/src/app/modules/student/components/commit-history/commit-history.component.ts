import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
 
@Component({
  selector: 'app-commit-history',
  templateUrl: './commit-history.component.html',
  styleUrls: ['./commit-history.component.css']
})
export class CommitHistoryComponent implements OnInit {
  commits: any[] = [];
  loading = true;
  error: string | null = null;
 
  // Repository info
  repositoryId: string = '';
  owner: string = '';
  repo: string = '';
  branch: string = 'main';
 
  // Modal for commit details
  showCommitDetails = false;
  selectedCommit: any = null;
  commitChanges: any[] = []; // Store changes to maintain expanded state
 
  // Contributors filtering
  allCommits: any[] = []; // Store all commits for filtering
  contributors: any[] = [];
  selectedContributor: string | null = null; // null means "All users"
  showContributorsDropdown = false;
 
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private cdr: ChangeDetectorRef
  ) {}
 
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.repositoryId = params['id'];
    });
 
    this.route.queryParams.subscribe(queryParams => {
      console.log('Query params received:', queryParams);
 
      this.owner = queryParams['owner'];
      this.repo = queryParams['repo'];
      this.branch = queryParams['branch'] || 'main';
 
      console.log('Extracted params:', { owner: this.owner, repo: this.repo, branch: this.branch });
      console.log('Owner type:', typeof this.owner);
 
      // Handle case where owner might be an object (shouldn't happen but let's be safe)
      if (typeof this.owner === 'object') {
        console.error('Owner is an object, this should not happen:', this.owner);
        this.error = 'Invalid owner parameter received';
        this.loading = false;
        return;
      }
 
      if (this.owner && this.repo) {
        this.loadCommits();
      } else {
        console.error('Missing owner or repo:', { owner: this.owner, repo: this.repo });
        this.error = 'Missing repository information';
        this.loading = false;
      }
    });
 
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const contributorsFilter = target.closest('.contributors-filter');
      const contributorsDropdown = target.closest('.contributors-dropdown');
 
      // Only close if clicking outside both the button and dropdown
      if (this.showContributorsDropdown && !contributorsFilter && !contributorsDropdown) {
        this.showContributorsDropdown = false;
        this.cdr.detectChanges();
      }
    });
  }
 
  loadCommits(): void {
    this.loading = true;
    this.error = null;
 
    this.studentService.getRepositoryCommits(this.owner, this.repo, this.branch, 1, 100).subscribe({
      next: (commits: any[]) => {
        this.allCommits = commits; // Store all commits
        this.extractContributors(commits);
        this.filterCommitsByContributor(); // Apply current filter
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading commits:', error);
        this.error = 'Failed to load commits';
        this.loading = false;
      }
    });
  }
 
  goBack(): void {
    this.router.navigate(['/student/repositories', this.repositoryId]);
  }
 
  getCommitsByDate(): any[] {
    const grouped: { [key: string]: any[] } = {};
   
    this.commits.forEach(commit => {
      const date = this.formatCommitDate(commit.authorDate || commit.date);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({
        ...commit,
        shortSha: commit.sha?.substring(0, 7),
        author: commit.authorName || commit.author,
        message: commit.message,
        date: commit.authorDate || commit.date,
        avatarUrl: commit.avatarUrl
      });
    });
 
    return Object.keys(grouped).map(date => ({
      date,
      commits: grouped[date]
    }));
  }
 
  formatCommitDate(dateString: string): string {
    if (!dateString) return 'Unknown date';
   
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
   
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
 
  getRelativeTime(dateString: string): string {
    if (!dateString) return 'unknown time';
   
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
   
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }
 
  selectCommit(commit: any): void {
    // Load detailed commit info with diff data
    this.studentService.getCommitDetails(this.owner, this.repo, commit.sha).subscribe({
      next: (commitDetails: any) => {
        console.log('Commit details received:', commitDetails);
        console.log('Files in commit:', commitDetails.files);
 
        this.selectedCommit = {
          ...commit,
          ...commitDetails,
          files: commitDetails.files || []
        };
 
        // Log each file's diff data
        if (commitDetails.files) {
          commitDetails.files.forEach((file: any, index: number) => {
            console.log(`File ${index}:`, file);
            console.log(`File ${index} patch:`, file.patch);
            console.log(`File ${index} status:`, file.status);
          });
        }
 
        // Process files into changes format and store them
        this.commitChanges = (commitDetails.files || []).map((file: any, index: number) => {
          const change = {
            file: file.filename || file.name || 'Unknown file',
            type: file.status || 'modified',
            additions: file.additions || 0,
            deletions: file.deletions || 0,
            isBinary: file.binary || false,
            expanded: false,
            diff: file.patch || 'No diff available',
            size: file.size || 0
          };
 
          console.log(`Change ${index}:`, change);
          return change;
        });
 
        console.log('Stored commitChanges:', this.commitChanges);
        this.showCommitDetails = true;
      },
      error: (error) => {
        console.error('Error loading commit details:', error);
        // Show basic commit info even if detailed loading fails
        this.selectedCommit = commit;
        this.showCommitDetails = true;
      }
    });
  }
 
  closeCommitDetails(): void {
    this.showCommitDetails = false;
    this.selectedCommit = null;
  }
 
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    });
  }
 
  getCommitDetails() {
    if (!this.selectedCommit) {
      return {
        sha: 'unknown',
        message: 'No commit selected',
        author: 'Unknown',
        date: 'Unknown',
        changes: [],
        stats: { additions: 0, deletions: 0, changedFiles: 0 }
      };
    }
   
    const files = this.selectedCommit.files || [];
    console.log('Processing files for commit details:', files);
 
    const changes = files.map((file: any, index: number) => {
      const change = {
        file: file.filename || file.name || 'Unknown file',
        type: file.status || 'modified',
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        isBinary: file.binary || false,
        expanded: false,
        diff: file.patch || 'No diff available',
        size: file.size || 0
      };
 
      console.log(`Change ${index}:`, change);
      return change;
    });
   
    const totalAdditions = files.reduce((sum: number, file: any) => sum + (file.additions || 0), 0);
    const totalDeletions = files.reduce((sum: number, file: any) => sum + (file.deletions || 0), 0);
   
    return {
      sha: this.selectedCommit.sha?.substring(0, 7) || 'unknown',
      message: this.selectedCommit.message || 'No commit message',
      author: this.selectedCommit.githubAuthorLogin || this.selectedCommit.authorName || this.selectedCommit.author || 'Unknown',
      date: this.selectedCommit.authorDate || this.selectedCommit.date || 'Unknown date',
      changes: changes,
      stats: {
        additions: totalAdditions,
        deletions: totalDeletions,
        changedFiles: files.length
      }
    };
  }
 
  toggleFileDiff(change: any): void {
    console.log('=== TOGGLE FILE DIFF CLICKED ===');
    console.log('File:', change.file);
    console.log('Current expanded state:', change.expanded);
    console.log('Change object:', change);
    console.log('Diff data length:', change.diff?.length);
    console.log('Diff preview:', change.diff?.substring(0, 200));
    console.log('Is binary:', change.isBinary);
    console.log('File type:', change.type);
    console.log('Additions:', change.additions);
    console.log('Deletions:', change.deletions);
 
    change.expanded = !change.expanded;
 
    console.log('New expanded state:', change.expanded);
    console.log('=== END TOGGLE ===');
 
    // Force change detection
    this.cdr.detectChanges();
  }
 
  parseDiffLines(diff: string): any[] {
    console.log('=== PARSING DIFF LINES ===');
    console.log('Diff input:', diff?.substring(0, 200) + '...');
 
    if (!diff || diff === 'No diff available') {
      console.log('No diff data available');
      return [];
    }
 
    const lines = diff.split('\n');
    console.log('Diff has', lines.length, 'lines');
    console.log('First 5 lines:', lines.slice(0, 5));
 
    const result: any[] = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;
   
    lines.forEach(line => {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNumber = parseInt(match[1]) - 1;
          newLineNumber = parseInt(match[2]) - 1;
        }
        result.push({ type: 'header', content: line, oldLineNumber: '', newLineNumber: '' });
      } else if (line.startsWith('+')) {
        newLineNumber++;
        result.push({ type: 'addition', content: line.substring(1), oldLineNumber: '', newLineNumber });
      } else if (line.startsWith('-')) {
        oldLineNumber++;
        result.push({ type: 'deletion', content: line.substring(1), oldLineNumber, newLineNumber: '' });
      } else {
        oldLineNumber++;
        newLineNumber++;
        result.push({ type: 'context', content: line.substring(1), oldLineNumber, newLineNumber });
      }
    });
   
    return result;
  }
 
  getDiffLineClass(line: any): string {
    return `diff-line diff-${line.type}`;
  }
 
  getDiffMarker(line: any): string {
    if (line.type === 'addition') return '+';
    if (line.type === 'deletion') return '-';
    return ' ';
  }
 
  getFileExtension(filename: string): string {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  }
 
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
 
  // Contributors filtering methods
  extractContributors(commits: any[]): void {
    console.log('Extracting contributors from', commits.length, 'commits');
    const contributorMap = new Map();
 
    commits.forEach((commit, index) => {
      console.log(`Commit ${index}:`, {
        githubAuthorLogin: commit.githubAuthorLogin,
        authorName: commit.authorName,
        author: commit.author,
        githubAuthorAvatar: commit.githubAuthorAvatar
      });
 
      const authorLogin = commit.githubAuthorLogin || commit.authorName || commit.author || 'Unknown';
      const authorName = commit.authorName || commit.author || authorLogin;
      const authorAvatar = commit.authorAvatar || commit.githubAuthorAvatar || '';
 
      if (!contributorMap.has(authorLogin)) {
        contributorMap.set(authorLogin, {
          login: authorLogin,
          name: authorName,
          avatar: authorAvatar,
          commitCount: 0
        });
      }
 
      contributorMap.get(authorLogin).commitCount++;
    });
 
    this.contributors = Array.from(contributorMap.values())
      .sort((a, b) => b.commitCount - a.commitCount); // Sort by commit count
 
    console.log('Extracted contributors:', this.contributors);
  }
 
  filterCommitsByContributor(): void {
    if (!this.selectedContributor) {
      // Show all commits
      this.commits = [...this.allCommits];
    } else {
      // Filter by selected contributor
      this.commits = this.allCommits.filter(commit => {
        const authorLogin = commit.githubAuthorLogin || commit.authorName || commit.author || 'Unknown';
        return authorLogin === this.selectedContributor;
      });
    }
 
    console.log(`Filtered commits: ${this.commits.length} of ${this.allCommits.length}`);
  }
 
  toggleContributorsDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
 
    console.log('Toggling contributors dropdown. Current state:', this.showContributorsDropdown);
    console.log('Contributors available:', this.contributors.length);
    console.log('All commits count:', this.allCommits.length);
 
    // Log contributor names
    console.log('Contributors list:');
    this.contributors.forEach((contributor, index) => {
      console.log(`${index + 1}. Name: ${contributor.name}, Login: ${contributor.login}, Commits: ${contributor.commitCount}`);
    });
 
    this.showContributorsDropdown = !this.showContributorsDropdown;
    console.log('New state:', this.showContributorsDropdown);
 
    // Force change detection
    this.cdr.detectChanges();
 
    // Debug: Check if dropdown element exists after state change
    setTimeout(() => {
      const dropdown = document.querySelector('.contributors-dropdown');
      console.log('Dropdown element found:', dropdown);
      if (dropdown) {
        console.log('Dropdown position:', dropdown.getBoundingClientRect());
        console.log('Dropdown computed style:', window.getComputedStyle(dropdown));
        console.log('Dropdown innerHTML length:', dropdown.innerHTML.length);
        console.log('Dropdown display style:', (dropdown as HTMLElement).style.display);
        console.log('Dropdown visibility:', window.getComputedStyle(dropdown).visibility);
      }
    }, 100);
  }
 
  selectContributor(contributor: any | null): void {
    console.log('Selecting contributor:', contributor);
 
    this.selectedContributor = contributor ? contributor.login : null;
    this.showContributorsDropdown = false;
 
    if (contributor) {
      console.log(`Filtering commits for: ${contributor.name} (${contributor.login})`);
    } else {
      console.log('Showing all commits');
    }
 
    this.filterCommitsByContributor();
    console.log('Dropdown closed, commits filtered');
  }
 
  getSelectedContributorName(): string {
    if (!this.selectedContributor) {
      return 'All users';
    }
 
    const contributor = this.contributors.find(c => c.login === this.selectedContributor);
    return contributor ? contributor.name : this.selectedContributor;
  }
}