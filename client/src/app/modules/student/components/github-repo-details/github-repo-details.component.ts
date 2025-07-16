import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StudentService } from '../../services/student.service';
import { GitHubService } from '../../../../services/github.service';

@Component({
  selector: 'app-github-repo-details',
  templateUrl: './github-repo-details.component.html',
  styleUrls: ['./github-repo-details.component.css']
})
export class GitHubRepoDetailsComponent implements OnInit, OnDestroy {
  window = window; // Add window reference for template access
  repository: any = null;
  loading = true;
  error: string | null = null;
  selectedActivityPeriod = '30 days';
  activityPeriods = ['7 days', '30 days', '90 days'];
  activeTab = 'code';
  showCloneModal = false;
  showFileContent = false;
  showCommitDetails = false;
  showCommitHistory = false;
  selectedFile: any = null;
  selectedCommit: any = null;
  fileContent = '';
  currentPath: string[] = [];
  currentBranch: string = 'main';
  branchSwitching: boolean = false;

  // Timer for updating relative timestamps
  private timeUpdateInterval: any;

  // File view state (for main view, not modal)
  isViewingFile = false;
  currentViewingFile: any = null;

  // File editing state
  isEditingFile = false;
  editedFileContent = '';
  editCommitMessage = '';
  isSavingFile = false;

  // File replacement state
  isReplacingFile = false;
  showReplaceModal = false;
  selectedReplaceFile: File | null = null;
  replaceCommitMessage = '';

  // File deletion state
  isDeletingFile = false;
  showDeleteModal = false;
  deleteCommitMessage = '';

  // Enhanced download state
  downloadError: string | null = null;
  isDownloading = false;
  downloadProgress: { [fileName: string]: boolean } = {};

  // Dynamic GitHub data properties
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
  branches: any[] = [];
  commits: any[] = [];
  latestCommit: any = null;
  fileTree: any = {};

  // Cache for branch files to avoid repeated API calls
  private branchFilesCache: Map<string, any[]> = new Map();
  // Cache for branch latest commits
  private branchCommitsCache: Map<string, any> = new Map();
  // Computed property for all branches to avoid calling method repeatedly
  allBranchesComputed: any[] = [];

  // Daily uploads data
  dailyUploads: any[] = [];

  // Upload functionality properties
  selectedUploadBranch: string = 'main';
  uploadCommitMessage: string = 'Add files via upload';
  isUploading = false;
  imageLoadError = false;
  showUploadModal = false;
  selectedFiles: File[] = [];

  // Repository description properties
  repositoryDescription: string = '';
  isEditingDescription: boolean = false;
  editingDescriptionText: string = '';
  readmeFile: any = null; // Store README file info for updates
  showMarkdownPreview: boolean = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studentService: StudentService,
    private readonly githubService: GitHubService,
    private readonly cdr: ChangeDetectorRef,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const repoId = params["id"]
      if (repoId) {
        this.loadRepositoryDetails(repoId)
      } else {
        this.error = "Repository ID not provided"
        this.loading = false
      }
    })

    // Start timer to update relative timestamps every 30 seconds
    this.timeUpdateInterval = setInterval(() => {
      // This will trigger change detection and update the displayed times
      this.updateRelativeTimestamps()
    }, 30000)
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval)
    }
  }

  private updateRelativeTimestamps(): void {
    // Update the lastModified display for all files with their raw dates
    if (this.repositoryFiles) {
      this.repositoryFiles = this.repositoryFiles.map((file) => ({
        ...file,
        lastModified: file.rawDate ? this.formatDate(file.rawDate) : file.lastModified,
      }))
    }

    // Also update the latest commit timestamp
    if (this.latestCommit && this.latestCommit.rawDate) {
      this.latestCommit = {
        ...this.latestCommit,
        date: this.formatDate(this.latestCommit.rawDate),
      }
    }
  }

  loadRepositoryDetails(repoId: string): void {
    this.loading = true
    this.error = null
    // First get repository details to extract owner/repo information
    this.studentService.getRepositoryDetails(repoId).subscribe({
      next: (repoData: any) => {
        console.log("Repository details:", repoData)
        this.repository = repoData
        this.currentBranch = repoData.defaultBranch ?? "main"

        // Extract owner and repo name
        const owner = repoData.owner?.login ?? repoData.fullName?.split("/")[0]
        const repoName = repoData.name ?? repoData.fullName?.split("/")[1]

        if (owner && repoName) {
          this.loadDynamicRepositoryData(owner, repoName)
          this.loadRepositoryDescription(owner, repoName)
        } else {
          this.error = "Unable to determine repository owner and name"
          this.loading = false
        }
      },
      error: (error) => {
        console.error("Error loading repository details:", error)
        this.error = "Failed to load repository details. Please try again."
        this.loading = false
      },
    })
  }

  private loadDynamicRepositoryData(owner: string, repo: string): void {
    console.log("=== LOADING DYNAMIC REPOSITORY DATA ===")
    console.log("Owner:", owner, "Repo:", repo, "Branch:", this.currentBranch)

    // Load comprehensive repository overview
    this.studentService.getRepositoryOverview(owner, repo, this.currentBranch).subscribe({
      next: (overview: any) => {
        console.log("Repository overview loaded:", overview)
        this.processDynamicData(overview)
        // Load additional data including real statistics
        this.loadAdditionalData(owner, repo)
      },
      error: (error) => {
        console.error("Error loading repository overview:", error)
        // Fallback to individual API calls
        this.loadDataSeparately(owner, repo)
      },
    })
  }

  private loadAdditionalData(owner: string, repo: string): void {
    // Load commits with pagination - load more for better statistics
    this.loadCommitsData(owner, repo)

    // Load contributors
    this.studentService.getRepositoryContributors(owner, repo).subscribe({
      next: (contributors: any[]) => {
        this.contributors = contributors.map((c) => ({
          name: c.login,
          commits: c.contributions,
          avatar: c.avatarUrl,
          url: c.htmlUrl,
        }))
        console.log("Contributors loaded:", this.contributors)
        this.refreshDynamicStats()
      },
      error: (error) => console.error("Error loading contributors:", error),
    })

    // Load branches
    this.studentService.getRepositoryBranches(owner, repo).subscribe({
      next: (branches: any[]) => {
        this.branches = branches
        // Update computed branches when branches are loaded
        this.getAllBranches()
        // Refresh dynamic stats after all data is loaded
        this.refreshDynamicStats()
      },
      error: (error) => console.error("Error loading branches:", error),
    })

    // Load actual repository statistics
    this.fetchTotalCommitCount(owner, repo, this.currentBranch)
    this.loading = false
  }

  private loadDataSeparately(owner: string, repo: string): void {
    // Fallback method if overview API fails
    this.studentService.getRepositoryFiles(owner, repo, "", this.currentBranch).subscribe({
      next: (files: any[]) => {
        this.repositoryFiles = this.processFileData(files)
        this.loadAdditionalData(owner, repo)
      },
      error: (error) => {
        console.error("Error loading repository files:", error)
        this.error = "Failed to load repository data"
        this.loading = false
      },
    })
  }

  private processDynamicData(data: any): void {
    console.log("=== PROCESSING DYNAMIC DATA ===")
    console.log("Data received:", data)

    // Process repository files from rootFiles and fileTree
    if (data.rootFiles) {
      console.log("Processing root files:", data.rootFiles.length)
      this.repositoryFiles = this.processFileData(data.rootFiles)
      // Cache the files for the current branch
      const currentBranch = data.currentBranch || this.currentBranch || "main"
      this.branchFilesCache.set(currentBranch, data.rootFiles)
      console.log("Cached files for branch:", currentBranch, "Files count:", data.rootFiles.length)
    }

    // Process file tree for navigation
    if (data.fileTree) {
      this.fileTree = data.fileTree
    }

    // Process latest commit
    if (data.recentCommits && data.recentCommits.length > 0) {
      console.log("Processing recent commits:", data.recentCommits.length)
      this.processCommitData(data.recentCommits)
      const latestCommit = data.recentCommits[0]
      const rawDate = latestCommit.date ?? latestCommit.authorDate ?? latestCommit.committerDate
      this.latestCommit = {
        message: latestCommit.message,
        author: latestCommit.authorName ?? latestCommit.author ?? latestCommit.githubAuthorLogin,
        date: this.formatDate(rawDate),
        rawDate: rawDate,
        sha: latestCommit.sha?.substring(0, 7) ?? "unknown",
        url: latestCommit.htmlUrl,
        avatarUrl: latestCommit.githubAuthorAvatarUrl ?? latestCommit.authorAvatarUrl,
      }
      // Cache the latest commit for the current branch
      const currentBranch = data.currentBranch || this.currentBranch || "main"
      this.branchCommitsCache.set(currentBranch, this.latestCommit)
      console.log("Cached latest commit for branch:", currentBranch)
    }

    // Process languages for file types
    if (data.languages) {
      this.processLanguages(data.languages)
    }

    // Update activity stats with real data
    if (data.recentCommits) {
      this.updateActivityStats(data.recentCommits)
    }

    // Process commits for daily uploads
    if (data.recentCommits) {
      this.commits = data.recentCommits
      this.dailyUploads = [] // Reset to regenerate
    }

    console.log("=== DYNAMIC DATA PROCESSING COMPLETE ===")
    console.log("Repository files:", this.repositoryFiles?.length || 0)
    console.log("Commits:", this.commits?.length || 0)
    console.log("Latest commit:", this.latestCommit)
  }

  private processFileData(files: any[]): any[] {
    return files.map((file: any) => {
      // Get the most accurate date from available sources
      const dateValue = file.lastModified || file.lastCommitDate || file.date || file.authorDate || file.committerDate
      return {
        name: file.name,
        type: file.type === "dir" ? "folder" : "file",
        size: file.sizeFormatted ?? this.formatFileSize(file.size ?? 0),
        lastModified: dateValue ? this.formatDate(dateValue) : this.getFileLastCommitDate(file),
        rawDate: dateValue, // Store raw date for timestamp updates
        message: file.lastCommitMessage ?? file.message ?? this.getFileLastCommitMessage(file),
        committer: file.lastCommitAuthor ?? file.committer ?? this.getFileLastCommitter(file),
        committerAvatar: file.lastCommitAuthorAvatar ?? file.committerAvatar ?? this.getFileLastCommitterAvatar(file),
        path: file.path,
        downloadUrl: file.downloadUrl,
        htmlUrl: file.htmlUrl,
        sha: file.sha,
        category: file.category,
        extension: file.extension,
        capabilities: file.capabilities,
      }
    })
  }

  // Enhanced commits loading for better statistics
  loadCommitsData(owner: string, repo: string): void {
    console.log("Loading commits data for statistics...")
    // Load more commits for better statistics (last 100 commits)
    this.studentService.getRepositoryCommits(owner, repo, this.currentBranch, 1, 100).subscribe({
      next: (commits: any[]) => {
        console.log("Loaded commits for statistics:", commits.length)
        this.processCommitData(commits)
        // Update activity stats with real data
        this.updateActivityStats(commits)
        // Refresh dashboard stats after loading commits
        this.refreshDynamicStats()
      },
      error: (error) => {
        console.error("Error loading commits for statistics:", error)
        // Set default values if commits can't be loaded
        this.commits = []
        this.updateActivityStats([])
        this.refreshDynamicStats()
      },
    })
  }

  // Update activity stats with real commit data
  updateActivityStats(commits: any[]): void {
    console.log("Updating activity stats with commits:", commits.length)
    // Calculate lines added/deleted from commit data
    let totalLinesAdded = 0
    let totalLinesDeleted = 0

    commits.forEach((commit) => {
      if (commit.files && Array.isArray(commit.files)) {
        commit.files.forEach((file: any) => {
          totalLinesAdded += file.additions || 0
          totalLinesDeleted += file.deletions || 0
        })
      }
    })

    this.activityStats = {
      totalCommits: commits.length,
      linesAdded: totalLinesAdded,
      linesDeleted: totalLinesDeleted,
    }

    console.log("Updated activity stats:", this.activityStats)
  }

  // Fixed method to fetch actual total commit count
  private fetchTotalCommitCount(owner: string, repo: string, branch: string): void {
    console.log("Fetching actual total commit count...")
    this.studentService.getRepositoryStats(owner, repo, branch).subscribe({
      next: (stats: any) => {
        console.log("Repository stats received:", stats)
        let actualTotalCommits = 0

        if (stats.totalCommits) {
          actualTotalCommits = stats.totalCommits
        } else if (stats.commitCount) {
          actualTotalCommits = stats.commitCount
        } else if (stats.commits) {
          actualTotalCommits = stats.commits
        }

        // Validate against contributor data
        const contributorCommits = this.getAllContributors().reduce((sum, c) => sum + c.commits, 0)
        if (contributorCommits > 0) {
          // Use contributor data as it's more reliable
          console.log("Using contributor commit count as it's more accurate:", contributorCommits)
          this.dashboardStats.totalCommits = contributorCommits
          this.activityStats.totalCommits = contributorCommits
        } else if (actualTotalCommits > 0) {
          // Use API data if no contributor data
          console.log("Using API commit count:", actualTotalCommits)
          this.dashboardStats.totalCommits = actualTotalCommits
          this.activityStats.totalCommits = actualTotalCommits
        }

        this.cdr.markForCheck()
        this.cdr.detectChanges()
      },
      error: (error) => {
        console.error("Error fetching repository stats:", error)
        // Use contributor data as fallback
        const contributorCommits = this.getAllContributors().reduce((sum, c) => sum + c.commits, 0)
        if (contributorCommits > 0) {
          this.dashboardStats.totalCommits = contributorCommits
          this.activityStats.totalCommits = contributorCommits
          this.cdr.markForCheck()
          this.cdr.detectChanges()
        }
      },
    })
  }

  private fetchCommitCountFromGitHub(owner: string, repo: string, branch: string): void {
    console.log("Fetching commit count from GitHub API...")
    // Alternative API call to get commit count
    this.studentService.getCommitCount(owner, repo, branch).subscribe({
      next: (response: any) => {
        console.log("GitHub commit count response:", response)
        let commitCount = 0

        if (typeof response === "number") {
          commitCount = response
        } else if (response.total) {
          commitCount = response.total
        } else if (response.count) {
          commitCount = response.count
        }

        if (commitCount > 0) {
          console.log("Updated total commits from GitHub API:", commitCount)
          this.dashboardStats.totalCommits = commitCount
          this.activityStats.totalCommits = commitCount
          // Force UI update
          this.cdr.markForCheck()
          this.cdr.detectChanges()
        } else {
          // Final fallback: estimate from available data
          const estimatedCommits = this.estimateCommitCount()
          if (estimatedCommits > 0) {
            this.dashboardStats.totalCommits = estimatedCommits
            this.activityStats.totalCommits = estimatedCommits
            this.cdr.markForCheck()
            this.cdr.detectChanges()
          }
        }
      },
      error: (error) => {
        console.error("Error fetching commit count from GitHub:", error)
        console.log("Using fallback commit count calculation")
        // Final fallback: estimate from available data
        const estimatedCommits = this.estimateCommitCount()
        if (estimatedCommits > 0) {
          this.dashboardStats.totalCommits = estimatedCommits
          this.activityStats.totalCommits = estimatedCommits
          this.cdr.markForCheck()
          this.cdr.detectChanges()
        }
      },
    })
  }

  private estimateCommitCount(): number {
    console.log("Estimating commit count from available data...")
    // Try to estimate from contributors
    if (this.contributors && this.contributors.length > 0) {
      const contributorCommits = this.contributors.reduce((sum, contributor) => {
        return sum + (contributor.commits || 0)
      }, 0)
      if (contributorCommits > 0) {
        console.log("Estimated commits from contributors:", contributorCommits)
        return contributorCommits
      }
    }

    // Try to estimate from file commit history
    if (this.repositoryFiles && this.repositoryFiles.length > 0) {
      // Very rough estimate: assume average of 2-3 commits per file
      const estimatedCommits = Math.ceil(this.repositoryFiles.length * 2.5)
      console.log("Estimated commits from file count:", estimatedCommits)
      return estimatedCommits
    }

    // If we have recent commits, provide a conservative estimate
    if (this.commits && this.commits.length > 0) {
      // If we loaded 100 recent commits, there might be more
      const recentCommitsCount = this.commits.length
      const estimatedTotal = recentCommitsCount >= 100 ? recentCommitsCount + 50 : recentCommitsCount
      console.log("Estimated total commits (conservative):", estimatedTotal)
      return estimatedTotal
    }

    console.log("Could not estimate commit count, returning 0")
    return 0
  }

  // Method to refresh all dynamic statistics
  refreshDynamicStats(): void {
    console.log("=== REFRESHING DYNAMIC STATS ===")
    console.log("Repository files:", this.repositoryFiles?.length || 0)
    console.log("Commits array:", this.commits?.length || 0)
    console.log("Contributors array:", this.contributors?.length || 0)
    console.log("All contributors computed:", this.getAllContributors()?.length || 0)

    // Calculate total files (only actual files, not folders)
    const totalFiles = this.repositoryFiles ? this.repositoryFiles.filter((file) => file.type === "file").length : 0

    // Calculate contributors
    const allContributors = this.getAllContributors()
    const totalContributors = allContributors.length

    // Calculate total commits from contributors (most accurate source)
    const allContributors2 = this.getAllContributors()
    const totalCommitsFromContributors = allContributors2.reduce((sum, contributor) => sum + contributor.commits, 0)

    // Use contributor data as the primary source for total commits
    let totalCommits = totalCommitsFromContributors

    // Only use other sources if we don't have contributor data
    if (totalCommits === 0) {
      if (this.commits && this.commits.length > 0) {
        totalCommits = this.commits.length
      } else if (this.latestCommit) {
        totalCommits = 1
      }
    }

    this.dashboardStats.totalCommits = totalCommits
    this.dashboardStats.contributors = totalContributors
    this.dashboardStats.totalFiles = totalFiles

    console.log("Updated dashboard stats:", this.dashboardStats)

    // Force change detection
    this.cdr.markForCheck()
    this.cdr.detectChanges()
  }

  // Enhanced total commits calculation
  getTotalCommits(): number {
    // First try to get from contributors (most accurate)
    const allContributors = this.getAllContributors()
    const contributorCommits = allContributors.reduce((total, contributor) => {
      return total + (contributor.commits || 0)
    }, 0)

    if (contributorCommits > 0) {
      return contributorCommits
    }

    // Fallback to dashboard stats
    if (this.dashboardStats && this.dashboardStats.totalCommits > 0) {
      return this.dashboardStats.totalCommits
    }

    // Fallback to activity stats
    if (this.activityStats && this.activityStats.totalCommits > 0) {
      return this.activityStats.totalCommits
    }

    // Final fallback to loaded commits count
    if (this.commits && this.commits.length > 0) {
      return this.commits.length
    }

    return 0
  }

  // Fixed daily commits calculation
  getDailyCommits(): any[] {
    console.log("=== CALCULATING DAILY COMMITS ===")
    console.log("Available commits:", this.commits?.length || 0)

    if (!this.commits || this.commits.length === 0) {
      console.log("No commits available, returning empty array")
      return this.getEmptyDailyCommits()
    }

    const last7Days = []
    const today = new Date()

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // Count commits for this day
      const dayCommits = this.commits.filter((commit) => {
        const commitDate = new Date(commit.rawDate || commit.date || commit.authorDate || commit.committerDate)
        return commitDate.toDateString() === date.toDateString()
      })

      const count = dayCommits.length
      console.log(`Day ${date.toDateString()}: ${count} commits`)

      last7Days.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: count,
        percentage: 0, // Will be calculated after we have all counts
      })
    }

    // Calculate percentages based on max count
    const maxCount = Math.max(...last7Days.map((day) => day.count), 1)
    last7Days.forEach((day) => {
      day.percentage = day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 0
    })

    console.log("Final daily commits:", last7Days)
    return last7Days
  }

  // Return empty daily commits structure when no data
  getEmptyDailyCommits(): any[] {
    const last7Days = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      last7Days.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: 0,
        percentage: 0,
      })
    }
    return last7Days
  }

  // Enhanced daily commits summary methods
  getTotalCommitsLast7Days(): number {
    const dailyCommits = this.getDailyCommits()
    const total = dailyCommits.reduce((sum, day) => sum + day.count, 0)
    console.log("Total commits last 7 days:", total)
    return total
  }

  getAverageCommitsPerDay(): string {
    const total = this.getTotalCommitsLast7Days()
    const average = total / 7
    return average.toFixed(1)
  }

  getMostActiveDay(): string {
    const dailyCommits = this.getDailyCommits()
    if (dailyCommits.length === 0) return "No data"

    const mostActive = dailyCommits.reduce((max, day) => (day.count > max.count ? day : max))
    return mostActive.count > 0 ? mostActive.date : "No activity"
  }

  // Enhanced contributors calculation
  getAllContributors(): any[] {
    console.log("=== CALCULATING ALL CONTRIBUTORS ===")
    const contributorsMap = new Map()

    // Add contributors from the API contributors array
    if (this.contributors && this.contributors.length > 0) {
      console.log("Adding contributors from API:", this.contributors.length)
      this.contributors.forEach((contributor) => {
        contributorsMap.set(contributor.name, {
          name: contributor.name,
          avatar: contributor.avatar,
          commits: contributor.commits,
        })
      })
    }

    // Add contributors from commits data
    if (this.commits && this.commits.length > 0) {
      console.log("Adding contributors from commits:", this.commits.length)
      const commitsByAuthor = new Map()

      this.commits.forEach((commit) => {
        const author = commit.author || commit.authorName || commit.githubAuthorLogin || "Unknown"
        const currentCount = commitsByAuthor.get(author) || 0
        commitsByAuthor.set(author, currentCount + 1)
      })

      commitsByAuthor.forEach((commitCount, author) => {
        if (!contributorsMap.has(author)) {
          contributorsMap.set(author, {
            name: author,
            avatar: this.getAuthorAvatar(author),
            commits: commitCount,
          })
        } else {
          // Update commit count if it's higher
          const existing = contributorsMap.get(author)
          if (commitCount > existing.commits) {
            existing.commits = commitCount
          }
        }
      })
    }

    // Add contributors from latest commit if available
    if (this.latestCommit && this.latestCommit.author) {
      console.log("Adding contributor from latest commit:", this.latestCommit.author)
      if (!contributorsMap.has(this.latestCommit.author)) {
        contributorsMap.set(this.latestCommit.author, {
          name: this.latestCommit.author,
          avatar: this.latestCommit.avatarUrl || this.getAuthorAvatar(this.latestCommit.author),
          commits: 1,
        })
      }
    }

    // Add contributors from file committers
    if (this.repositoryFiles && this.repositoryFiles.length > 0) {
      console.log("Adding contributors from file committers")
      this.repositoryFiles.forEach((file: any) => {
        if (file.committer && !contributorsMap.has(file.committer)) {
          contributorsMap.set(file.committer, {
            name: file.committer,
            avatar: file.committerAvatar || this.getAuthorAvatar(file.committer),
            commits: 1,
          })
        }
      })
    }

    // Ensure at least one contributor exists
    if (contributorsMap.size === 0) {
      console.log("No contributors found, adding default")
      const defaultCommitter = this.getDefaultCommitter()
      contributorsMap.set(defaultCommitter, {
        name: defaultCommitter,
        avatar: this.getDefaultCommitterAvatar(),
        commits: Math.max(this.getTotalCommits(), 1),
      })
    }

    const result = Array.from(contributorsMap.values()).sort((a, b) => b.commits - a.commits)
    console.log("Final contributors:", result)
    return result
  }

  // Helper method to get author avatar
  getAuthorAvatar(authorName: string): string {
    // Try to find avatar from commits
    if (this.commits && this.commits.length > 0) {
      const commitWithAvatar = this.commits.find(
        (commit) => (commit.author === authorName || commit.authorName === authorName) && commit.avatarUrl,
      )
      if (commitWithAvatar && commitWithAvatar.avatarUrl) {
        return commitWithAvatar.avatarUrl
      }
    }

    // Fallback to GitHub identicon
    return `https://github.com/identicons/${authorName}.png`
  }

  // Enhanced branch file count calculation
  getBranchFileCount(branchName: string): number {
    console.log("Getting file count for branch:", branchName)
    if (branchName === this.currentBranch) {
      const count = this.repositoryFiles ? this.repositoryFiles.filter((file) => file.type === "file").length : 0
      console.log("Current branch file count:", count)
      return count
    }

    // Try to get from cache
    const cachedFiles = this.branchFilesCache.get(branchName)
    if (cachedFiles) {
      const count = cachedFiles.filter((file) => file.type !== "dir").length
      console.log("Cached branch file count:", count)
      return count
    }

    console.log("No file count available for branch:", branchName)
    return 0
  }

  getBranchLastCommit(branchName: string): string {
    if (branchName === this.currentBranch && this.latestCommit) {
      return this.latestCommit.date
    }

    // Try to get from cache
    const cachedCommit = this.branchCommitsCache.get(branchName)
    if (cachedCommit) {
      return cachedCommit.date
    }

    return ""
  }

  // Contributors statistics methods
  getContributorPercentage(commits: number): number {
    const totalCommits = this.getAllContributors().reduce((total, contributor) => total + contributor.commits, 0)
    return totalCommits > 0 ? Math.round((commits / totalCommits) * 100) : 0
  }

  getContributorColor(index: number): string {
    const colors = [
      "#1f77b4",
      "#ff7f0e",
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf",
    ]
    return colors[index % colors.length]
  }

  // Public methods for template access
  public getDefaultCommitter(): string {
    return this.repository?.owner?.login || this.repository?.fullName?.split("/")[0] || "unknown"
  }

  public getDefaultCommitterAvatar(): string {
    const committer = this.getDefaultCommitter()
    return this.repository?.owner?.avatar_url || `https://github.com/${committer}.png`
  }

  public getRelativeTime(date: Date | string): string {
    const now = new Date()
    const targetDate = typeof date === "string" ? new Date(date) : date
    const diffInMs = now.getTime() - targetDate.getTime()
    const diffSeconds = Math.floor(diffInMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return diffSeconds <= 5 ? "now" : `${diffSeconds} seconds ago`
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`
    } else if (diffHours < 24) {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`
    } else if (diffDays === 0) {
      return "today"
    } else if (diffDays === 1) {
      return "1 day ago"
    } else if (diffDays < 30) {
      return `${diffDays} days ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return months === 1 ? "1 month ago" : `${months} months ago`
    } else {
      const years = Math.floor(diffDays / 365)
      return years === 1 ? "1 year ago" : `${years} years ago`
    }
  }

  public getAllBranches(): any[] {
    const allBranches = []
    const addedBranches = new Set()

    // Add default branch first
    const defaultBranch = this.repository?.defaultBranch || "main"
    allBranches.push({ name: defaultBranch })
    addedBranches.add(defaultBranch)

    // Add current branch if it's different from default
    if (this.currentBranch && this.currentBranch !== defaultBranch && !addedBranches.has(this.currentBranch)) {
      allBranches.push({ name: this.currentBranch })
      addedBranches.add(this.currentBranch)
    }

    // Add other branches from API, but avoid duplicates
    if (this.branches && this.branches.length > 0) {
      this.branches.forEach((branch) => {
        const branchName = branch.name || branch
        if (!addedBranches.has(branchName)) {
          allBranches.push({ name: branchName })
          addedBranches.add(branchName)
        }
      })
    }

    // Update computed property and force change detection
    this.allBranchesComputed = allBranches
    this.cdr.markForCheck()

    console.log("=== GET ALL BRANCHES DEBUG ===")
    console.log("Repository default branch:", this.repository?.defaultBranch)
    console.log("Current branch:", this.currentBranch)
    console.log("Branches from API:", this.branches)
    console.log("Final computed branches:", allBranches)
    console.log("=== END GET ALL BRANCHES DEBUG ===")

    return allBranches
  }

  // Debug method to check state
  debugBranchState(): void {
    console.log("=== BRANCH DEBUG STATE ===")
    console.log("Current branch:", this.currentBranch)
    console.log("Repository files count:", this.repositoryFiles?.length || 0)
    console.log("Repository files:", this.repositoryFiles)
    console.log("Branch switching:", this.branchSwitching)
    console.log("All branches computed:", this.allBranchesComputed)
    console.log("Cache keys:", Array.from(this.branchFilesCache.keys()))
    console.log("Latest commit:", this.latestCommit)
    console.log("=== END BRANCH DEBUG STATE ===")
  }

  // TrackBy functions for better change detection
  trackByBranchName(index: number, branch: any): string {
    return branch.name
  }

  trackByFileName(index: number, file: any): string {
    return file.path || file.name
  }

  // Daily uploads methods
  getDailyUploads(): any[] {
    if (this.dailyUploads.length === 0) {
      this.generateDailyUploadsFromCommits()
    }
    return this.dailyUploads
  }

  private generateDailyUploadsFromCommits(): void {
    const last7Days = []
    const today = new Date()

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      // Count commits for this day
      const dayCommits = this.commits.filter((commit) => {
        const commitDate = new Date(commit.date || commit.authorDate || commit.committerDate)
        return commitDate.toDateString() === date.toDateString()
      })

      const count = dayCommits.length
      const maxCount = Math.max(...this.commits.slice(0, 7).map(() => 1), 1)

      last7Days.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: count,
        percentage: Math.max((count / maxCount) * 100, count > 0 ? 10 : 0), // Minimum 10% if there are uploads
      })
    }

    this.dailyUploads = last7Days
  }

  getUploadColor(count: number): string {
    if (count === 0) return "#ebedf0"
    if (count <= 2) return "#9be9a8"
    if (count <= 4) return "#40c463"
    if (count <= 6) return "#30a14e"
    return "#216e39"
  }

  getTotalUploads(): number {
    return this.dailyUploads.reduce((total, day) => total + day.count, 0)
  }

  getAverageUploads(): string {
    const total = this.getTotalUploads()
    const average = total / 7
    return average.toFixed(1)
  }

  getCommitColor(count: number): string {
    if (count === 0) return "#ebedf0"
    if (count <= 1) return "#9be9a8"
    if (count <= 3) return "#40c463"
    if (count <= 5) return "#30a14e"
    return "#216e39"
  }

  public onCommitAvatarError(event: any): void {
    const author = this.latestCommit?.author || this.getDefaultCommitter()
    event.target.src = `https://github.com/identicons/${author}.png`
  }

  public onFileCommitterAvatarError(event: any, committer: string): void {
    event.target.src = `https://github.com/identicons/${committer}.png`
  }

  public onContributorAvatarError(event: any, contributorName: string): void {
    event.target.src = `https://github.com/identicons/${contributorName}.png`
  }

  public onDefaultContributorAvatarError(event: any): void {
    const committer = this.getDefaultCommitter()
    event.target.src = `https://github.com/identicons/${committer}.png`
  }

  private getFileLastCommitDate(file: any): string {
    // Try to find the last commit that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(
        (commit) => commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path),
      )
      if (fileCommit) {
        return this.formatDate(fileCommit.rawDate || fileCommit.date)
      }
    }

    // Fallback to latest commit date if available
    if (this.latestCommit && this.latestCommit.date) {
      return this.latestCommit.date
    }

    return "Unknown"
  }

  private getFileLastCommitMessage(file: any): string {
    // Try to find the last commit message that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(
        (commit) => commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path),
      )
      if (fileCommit) {
        return fileCommit.message
      }
    }

    // Fallback to latest commit message if available
    if (this.latestCommit && this.latestCommit.message) {
      return this.latestCommit.message
    }

    return "Initial commit"
  }

  private getFileLastCommitter(file: any): string {
    // Try to find the last committer that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(
        (commit) => commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path),
      )
      if (fileCommit) {
        return fileCommit.author
      }
    }

    // Fallback to latest commit author if available
    if (this.latestCommit && this.latestCommit.author) {
      return this.latestCommit.author
    }

    return this.getDefaultCommitter()
  }

  private getFileLastCommitterAvatar(file: any): string {
    // Try to find the last committer avatar that affected this file
    if (this.commits && this.commits.length > 0) {
      const fileCommit = this.commits.find(
        (commit) => commit.files && commit.files.some((f: any) => f.filename === file.name || f.filename === file.path),
      )
      if (fileCommit) {
        return fileCommit.avatarUrl
      }
    }

    // Fallback to latest commit avatar if available
    if (this.latestCommit && this.latestCommit.avatarUrl) {
      return this.latestCommit.avatarUrl
    }

    return this.getDefaultCommitterAvatar()
  }

  // Repository description methods
  private loadRepositoryDescription(owner: string, repo: string): void {
    console.log("Loading repository description for:", owner, repo, "branch:", this.currentBranch)
    // Try to load README.md file from current branch
    this.studentService.getFileContent(owner, repo, "README.md", this.currentBranch || "main").subscribe({
      next: (readmeContent: any) => {
        console.log("README.md found:", readmeContent)
        this.readmeFile = readmeContent
        // Properly decode the base64 content
        try {
          if (readmeContent.content) {
            const decodedContent = this.decodeBase64Content(readmeContent.content)
            console.log("Decoded README content:", decodedContent)
            // Use any meaningful content
            if (decodedContent && decodedContent.trim()) {
              this.repositoryDescription = decodedContent.trim()
            } else {
              this.repositoryDescription = ""
            }
          } else {
            console.warn("README.md found but no content property")
            this.repositoryDescription = ""
          }
        } catch (error) {
          console.error("Error decoding README content:", error)
          this.repositoryDescription = ""
        }
        console.log("Final repository description:", this.repositoryDescription)
      },
      error: (error) => {
        console.log("No README.md found or error loading it:", error)
        // Try to load from main branch if current branch failed
        if (this.currentBranch && this.currentBranch !== "main") {
          console.log("Trying to load README.md from main branch...")
          this.loadReadmeFromBranch(owner, repo, "main")
        } else {
          this.repositoryDescription = ""
          this.readmeFile = null
        }
      },
    })
  }

  private loadReadmeFromBranch(owner: string, repo: string, branch: string): void {
    this.studentService.getFileContent(owner, repo, "README.md", branch).subscribe({
      next: (readmeContent: any) => {
        console.log("README.md found in", branch, "branch:", readmeContent)
        this.readmeFile = readmeContent
        try {
          if (readmeContent.content) {
            const decodedContent = this.decodeBase64Content(readmeContent.content)
            if (decodedContent && decodedContent.trim()) {
              this.repositoryDescription = decodedContent.trim()
            } else {
              this.repositoryDescription = ""
            }
          }
        } catch (error) {
          console.error("Error decoding README content from", branch, ":", error)
          this.repositoryDescription = ""
        }
      },
      error: (error) => {
        console.log("No README.md found in", branch, "branch:", error)
        this.repositoryDescription = ""
        this.readmeFile = null
      },
    })
  }

  public toggleDescriptionEdit(): void {
    this.isEditingDescription = !this.isEditingDescription
    if (this.isEditingDescription) {
      this.editingDescriptionText = this.repositoryDescription
    }
  }

  public saveDescription(): void {
    const description = this.editingDescriptionText.trim()
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (!owner || !repoName) {
      console.error("Unable to determine repository owner and name")
      return
    }

    // Save description to README.md file
    this.saveDescriptionToReadme(owner, repoName, description)
  }

  private saveDescriptionToReadme(owner: string, repo: string, description: string): void {
    const commitMessage = "Update repository description"
    const targetBranch = this.currentBranch || "main"

    // Add some basic formatting to make it a proper README
    const readmeContent = description.trim() ? description.trim() : "No description provided."

    console.log("Saving README to branch:", targetBranch)

    if (this.readmeFile && this.readmeFile.sha) {
      // Update existing README.md
      console.log("Updating existing README.md with SHA:", this.readmeFile.sha)
      this.studentService
        .updateFile(owner, repo, "README.md", readmeContent, commitMessage, this.readmeFile.sha, targetBranch)
        .subscribe({
          next: (result: any) => {
            console.log("README.md updated successfully:", result)
            this.repositoryDescription = description
            this.isEditingDescription = false
            // Update the readmeFile with new SHA from the response
            if (result.content && result.content.sha) {
              this.readmeFile.sha = result.content.sha
            } else if (result.sha) {
              this.readmeFile.sha = result.sha
            }
            alert("Repository description updated successfully!")
            // Refresh the repository data to show the updated README
            this.refreshFileList()
            // Reload the description to ensure persistence
            setTimeout(() => {
              this.loadRepositoryDescription(owner, repo)
            }, 1000)
          },
          error: (error) => {
            console.error("Error updating README.md:", error)
            console.error("Error details:", error.error)
            let errorMessage = "Failed to update repository description."
            if (error.error && error.error.message) {
              errorMessage += " " + error.error.message
            }
            alert(errorMessage)
          },
        })
    } else {
      // Create new README.md
      console.log("Creating new README.md file")
      this.studentService.createFile(owner, repo, "README.md", readmeContent, commitMessage, targetBranch).subscribe({
        next: (result: any) => {
          console.log("README.md created successfully:", result)
          this.repositoryDescription = description
          this.isEditingDescription = false
          // Store the new file info for future updates
          this.readmeFile = result.content || result
          alert("Repository description created successfully!")
          // Refresh the repository data to show the new README
          this.refreshFileList()
          // Reload the description to ensure persistence
          setTimeout(() => {
            this.loadRepositoryDescription(owner, repo)
          }, 1000)
        },
        error: (error) => {
          console.error("Error creating README.md:", error)
          console.error("Error details:", error.error)
          let errorMessage = "Failed to create repository description."
          if (error.error && error.error.message) {
            errorMessage += " " + error.error.message
          }
          alert(errorMessage)
        },
      })
    }
  }

  public cancelDescriptionEdit(): void {
    this.isEditingDescription = false
    this.editingDescriptionText = ""
    this.showMarkdownPreview = false
  }

  // Markdown functionality methods
  insertMarkdown(before: string, after: string): void {
    const textarea = document.querySelector('textarea.description-textarea') as HTMLTextAreaElement
    if (!textarea) {
      console.warn('Textarea not found')
      return
    }

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const selectedText = this.editingDescriptionText.substring(start, end)

    const beforeText = this.editingDescriptionText.substring(0, start)
    const afterText = this.editingDescriptionText.substring(end)

    // Insert the markdown formatting
    this.editingDescriptionText = beforeText + before + selectedText + after + afterText

    // Set cursor position after the inserted text
    setTimeout(() => {
      const newPosition = start + before.length + selectedText.length + after.length
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    }, 10)
  }

  togglePreview(): void {
    this.showMarkdownPreview = !this.showMarkdownPreview
  }

  getMarkdownPreview(): SafeHtml {
    if (!this.editingDescriptionText) return this.sanitizer.bypassSecurityTrustHtml('')

    // Simple markdown to HTML conversion
    let html = this.editingDescriptionText

    // Escape HTML first
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Headers (process from h3 to h1 to avoid conflicts)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Code blocks (process before inline code)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Bold (process before italic to avoid conflicts)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

    // Blockquotes
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>')

    // Lists - handle multiple consecutive list items
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>')
    html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')

    // Wrap consecutive list items in ul/ol tags
    html = html.replace(/(<li>.*?<\/li>)(\s*<br>\s*<li>.*?<\/li>)*/g, (match) => {
      return '<ul>' + match.replace(/<br>\s*/g, '') + '</ul>'
    })

    // Convert line breaks to paragraphs for better formatting
    html = html.split('<br><br>').map(paragraph => {
      if (paragraph.trim() && !paragraph.match(/^<(h[1-6]|ul|ol|blockquote|pre)/)) {
        return '<p>' + paragraph.replace(/<br>/g, ' ') + '</p>'
      }
      return paragraph
    }).join('')

    // Clean up remaining single line breaks
    html = html.replace(/<br>/g, ' ')

    return this.sanitizer.bypassSecurityTrustHtml(html)
  }
 getRenderedMarkdown(markdown: string): SafeHtml {
    if (!markdown) return this.sanitizer.bypassSecurityTrustHtml("")

    // Use the same markdown conversion logic as getMarkdownPreview()
    let html = markdown

    // Escape HTML first
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    // Headers (process from h3 to h1 to avoid conflicts)
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>")
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>")
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>")

    // Code blocks (process before inline code)
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

    // Bold (process before italic to avoid conflicts)
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

    // Italic
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>")

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>")

    // Links
    html = html.replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

    // Blockquotes
    html = html.replace(/^&gt; (.*$)/gim, "<blockquote>$1</blockquote>")

    // Lists
    html = html.replace(/^- (.*$)/gim, "<li>$1</li>")
    html = html.replace(/^(\d+)\. (.*$)/gim, "<li>$2</li>")

    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li>.*?<\/li>)(\s*<br>\s*<li>.*?<\/li>)*/g, (match) => {
      return "<ul>" + match.replace(/<br>\s*/g, "") + "</ul>"
    })

    // Convert line breaks to paragraphs for better formatting
    html = html
      .split("<br><br>")
      .map((paragraph) => {
        if (paragraph.trim() && !paragraph.match(/^<(h[1-6]|ul|ol|blockquote|pre)/)) {
          return "<p>" + paragraph.replace(/<br>/g, " ") + "</p>"
        }
        return paragraph
      })
      .join("")

    // Clean up remaining single line breaks
    html = html.replace(/<br>/g, " ")

    return this.sanitizer.bypassSecurityTrustHtml(html)
  }

  private processCommitData(commits: any[]): void {
    // Update commits array and extract latest commit if not already set
    this.commits = commits.map((commit) => {
      const rawDate = commit.date ?? commit.authorDate ?? commit.committerDate
      return {
        sha: commit.sha,
        shortSha: commit.sha?.substring(0, 7) ?? "unknown",
        message: commit.message,
        author: commit.authorName ?? commit.author ?? commit.githubAuthorLogin,
        authorEmail: commit.authorEmail,
        date: this.formatDate(rawDate),
        rawDate: rawDate,
        url: commit.htmlUrl,
        avatarUrl: commit.githubAuthorAvatarUrl,
        files: commit.files || [],
      }
    })

    // Set latest commit if not already set
    if (!this.latestCommit && commits.length > 0) {
      const latest = this.commits[0]
      this.latestCommit = latest
    }
  }

  formatRepositorySize(sizeInKB: number): string {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(1)} MB`
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`
    }
  }

  formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString)
      return "Unknown"
    }

    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffTime / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return diffSeconds <= 5 ? "now" : `${diffSeconds} seconds ago`
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`
    } else if (diffHours < 24) {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`
    } else if (diffDays === 0) {
      return "today"
    } else if (diffDays === 1) {
      return "1 day ago"
    } else if (diffDays < 30) {
      return `${diffDays} days ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30))
      return months === 1 ? "1 month ago" : `${months} months ago`
    } else {
      const years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365))
      return years === 1 ? "1 year ago" : `${years} year ago`
    }
  }

  private processLanguages(languages: { [key: string]: number }): void {
    const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)
    if (total === 0) {
      this.fileTypes = []
      return
    }

    // Define colors for common languages
    const languageColors: { [key: string]: string } = {
      JavaScript: "#f1e05a",
      TypeScript: "#3178c6",
      Python: "#3776ab",
      Java: "#b07219",
      "C++": "#f34b7d",
      C: "#555555",
      HTML: "#e34c26",
      CSS: "#1572b6",
      PHP: "#4f5d95",
      Ruby: "#701516",
      Go: "#00add8",
      Rust: "#dea584",
      Swift: "#fa7343",
      Kotlin: "#a97bff",
      Dart: "#00b4ab",
      "C#": "#239120",
      Shell: "#89e051",
      PowerShell: "#012456",
      Dockerfile: "#384d54",
      JSON: "#292929",
      YAML: "#cb171e",
      Markdown: "#083fa1",
    }

    this.fileTypes = Object.entries(languages)
      .map(([language, bytes]) => ({
        type: language.toLowerCase(),
        name: language,
        percentage: Math.round((bytes / total) * 100),
        color: languageColors[language] ?? "#6c757d",
        size: this.formatFileSize(bytes),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10) // Show top 10 languages
  }

  // Navigation and UI methods
  goBack(): void {
    this.router.navigate(["/student/repositories"])
  }

  onActivityPeriodChange(period: string): void {
    this.selectedActivityPeriod = period
    // Here you would typically reload activity data for the selected period
  }

  refreshData(): void {
    if (this.repository) {
      this.loadRepositoryDetails(this.repository.id)
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab
  }

  toggleCloneModal(): void {
    this.showCloneModal = !this.showCloneModal
  }

  closeCloneModal(): void {
    this.showCloneModal = false
  }

  openCloneModal(): void {
    this.showCloneModal = true
  }

  // Removed openCommitDetails - only use "View Commit History" button
  closeCommitDetails(): void {
    this.showCommitDetails = false
    this.selectedCommit = null
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Copied to clipboard")
        // You could show a toast notification here
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err)
      })
  }

  downloadZip(): void {
    if (this.repository) {
      const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
      const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]
      if (owner && repoName) {
        // Use GitHub's download ZIP URL
        const downloadUrl = `https://github.com/${owner}/${repoName}/archive/${this.currentBranch}.zip`
        window.open(downloadUrl, "_blank")
      }
    }
  }

  getFileIcon(type: string): string {
    return type === "folder" ? "fas fa-folder" : "fas fa-file"
  }

  getFileIconColor(fileName: string, type: string): string {
    if (type === "folder") return "#79b8ff"

    const extension = fileName.split(".").pop()?.toLowerCase()
    const colors: { [key: string]: string } = {
      md: "#083fa1",
      json: "#f1e05a",
      html: "#e34c26",
      css: "#563d7c",
      js: "#f1e05a",
      ts: "#2b7489",
      py: "#3572a5",
      txt: "#6c757d",
      jpg: "#f39c12",
      png: "#f39c12",
      gitignore: "#6c757d",
      gitattributes: "#6c757d",
      csv: "#2b7489",
    }
    return colors[extension ?? ""] ?? "#6c757d"
  }

  // File operations
  onFileClick(file: any): void {
    if (file.type === "folder") {
      this.navigateToFolder(file.path)
    } else {
      this.handleFileClick(file)
    }
  }

  handleFileClick(file: any): void {
    const extension = file.name.split(".").pop()?.toLowerCase()
    // Handle different file types
    if (this.isImageFile(file.name)) {
      // Images: Display in viewer
      this.openFileContent(file)
    } else if (this.isOfficeFile(file.name)) {
      // Office files (Excel, Word, PowerPoint): Show download message
      this.showDownloadMessage(file, "This file is too large to preview. Click download to view.")
    } else if (this.isArchiveFile(file.name)) {
      // Archives (ZIP, RAR): Show download message
      this.showDownloadMessage(file, "Archive files cannot be previewed. Click download to extract.")
    } else if (this.isExecutableFile(file.name)) {
      // Executables: Show download message
      this.showDownloadMessage(file, "Executable files cannot be previewed. Click download to save.")
    } else if (this.isPdfFile(file.name)) {
      // PDF: Show download message
      this.showDownloadMessage(file, "PDF files are too large to preview. Click download to view.")
    } else if (this.isVideoFile(file.name)) {
      // Videos: Show download message
      this.showDownloadMessage(file, "Video files are too large to preview. Click download to view.")
    } else if (this.isAudioFile(file.name)) {
      // Audio: Show download message
      this.showDownloadMessage(file, "Audio files cannot be previewed. Click download to listen.")
    } else if (this.isTextFile(file.name)) {
      // Text files: Display content
      this.openFileContent(file)
    } else {
      // Unknown files: Show download message
      this.showDownloadMessage(file, "This file type cannot be previewed. Click download to view.")
    }
  }

  navigateToFolder(path: string): void {
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      this.studentService.getRepositoryFiles(owner, repoName, path, this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files)
          this.currentPath = path.split("/").filter((p) => p.length > 0)
        },
        error: (error) => {
          console.error("Error loading folder contents:", error)
        },
      })
    }
  }

  openFileContent(file: any): void {
    this.resetImageError() // Reset image error state
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    console.log("=== Opening file content ===")
    console.log("File object:", file)
    console.log("Repository info:", { owner, repoName, branch: this.currentBranch })
    console.log("Current path:", this.currentPath)

    if (owner && repoName) {
      // For HTML files, show warning instead of loading content to avoid sandboxing issues
      if (this.isHtmlFile(file.name)) {
        this.currentViewingFile = file
        this.fileContent = "HTML files cannot be safely previewed due to security restrictions. Click download to view the file."
        this.isViewingFile = true
        console.log("=== HTML file - showing warning ===")
        return
      }

      // For images, set up for display but don't fetch content
      if (this.isImageFile(file.name)) {
        this.currentViewingFile = file
        this.fileContent = ""
        this.isViewingFile = true
        console.log("=== Image file setup ===")
        console.log("Image URL will be:", this.getFileDownloadUrl(file))
        return
      }

      // For other binary files, we don't need to fetch the content
      if (this.isBinaryFile(file.name)) {
        this.currentViewingFile = file
        this.fileContent = ""
        this.isViewingFile = true
        return
      }

      // For text files, fetch the content
      this.studentService.getFileContent(owner, repoName, file.path, this.currentBranch).subscribe({
        next: (content: any) => {
          this.currentViewingFile = { ...file, ...content }
          this.fileContent = this.decodeBase64Content(content.content)
          this.isViewingFile = true
        },
        error: (error) => {
          console.error("Error loading file content:", error)
        },
      })
    }
  }

  decodeBase64Content(base64Content: string): string {
    try {
      return atob(base64Content)
    } catch (error) {
      console.error("Error decoding base64 content:", error)
      return "Unable to decode file content"
    }
  }

  // ENHANCED: Enhanced file type detection methods with better special character handling
  isImageFile(fileName: string): boolean {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico", "tiff", "tif"]
    const extension = fileName.split(".").pop()?.toLowerCase()
    return imageExtensions.includes(extension ?? "")
  }

  isHtmlFile(fileName: string): boolean {
    const extension = fileName.split(".").pop()?.toLowerCase()
    return extension === "html" || extension === "htm"
  }

  isOfficeFile(fileName: string): boolean {
    const officeExtensions = [
      "xlsx",
      "xls",
      "docx",
      "doc",
      "pptx",
      "ppt",
      "xlsm",
      "xlsb",
      "xltx",
      "xltm",
      "odt",
      "ods",
      "odp",
    ]
    const extension = fileName.split(".").pop()?.toLowerCase()
    return officeExtensions.includes(extension ?? "")
  }

  isArchiveFile(fileName: string): boolean {
    const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tar.gz", "tar.bz2", "tar.xz"]
    const extension = fileName.split(".").pop()?.toLowerCase()
    const fullName = fileName.toLowerCase()
    // Check for compound extensions like .tar.gz
    return (
      archiveExtensions.includes(extension ?? "") ||
      fullName.endsWith(".tar.gz") ||
      fullName.endsWith(".tar.bz2") ||
      fullName.endsWith(".tar.xz")
    )
  }

  isExecutableFile(fileName: string): boolean {
    const executableExtensions = ["exe", "msi", "dmg", "pkg", "deb", "rpm", "app", "run", "bin"]
    const extension = fileName.split(".").pop()?.toLowerCase()
    return executableExtensions.includes(extension ?? "")
  }

  isPdfFile(fileName: string): boolean {
    const extension = fileName.split(".").pop()?.toLowerCase()
    return extension === "pdf"
  }

  isVideoFile(fileName: string): boolean {
    const videoExtensions = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp", "ogv"]
    const extension = fileName.split(".").pop()?.toLowerCase()
    return videoExtensions.includes(extension ?? "")
  }

  isAudioFile(fileName: string): boolean {
    const audioExtensions = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus"]
    const extension = fileName.split(".").pop()?.toLowerCase()
    return audioExtensions.includes(extension ?? "")
  }

  // ENHANCED: Enhanced text file detection
  isTextFile(fileName: string): boolean {
    const textExtensions = [
      "txt",
      "md",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "ts",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
      "php",
      "rb",
      "go",
      "rs",
      "swift",
      "kt",
      "scala",
      "sh",
      "bat",
      "ps1",
      "yml",
      "yaml",
      "toml",
      "ini",
      "cfg",
      "conf",
      "log",
      "sql",
      "r",
      "matlab",
      "m",
      "dockerfile",
      "gitignore",
      "gitattributes",
      "license",
      "readme",
      "changelog",
      "makefile",
      "cmake",
      "gradle",
      "properties",
      "env",
    ]
    const extension = fileName.split(".").pop()?.toLowerCase()
    const nameOnly = fileName.toLowerCase()
    // Check extension or common filenames without extensions
    return (
      textExtensions.includes(extension ?? "") ||
      ["dockerfile", "makefile", "license", "readme", "changelog"].includes(nameOnly)
    )
  }

  // ENHANCED: Enhanced binary file detection
  isBinaryFile(fileName: string): boolean {
    const binaryExtensions = [
      // Images
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
      "ico",
      "tiff",
      "tif",
      "svg",
      // Documents
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "odt",
      "ods",
      "odp",
      // Archives
      "zip",
      "rar",
      "7z",
      "tar",
      "gz",
      "bz2",
      "xz",
      // Executables
      "exe",
      "dll",
      "so",
      "dylib",
      "bin",
      "run",
      "app",
      "msi",
      "deb",
      "rpm",
      "pkg",
      "dmg",
      // Media
      "mp4",
      "avi",
      "mkv",
      "mov",
      "wmv",
      "flv",
      "webm",
      "m4v",
      "3gp",
      "ogv",
      "mp3",
      "wav",
      "flac",
      "aac",
      "ogg",
      "m4a",
      "wma",
      "opus",
      // Fonts
      "ttf",
      "otf",
      "woff",
      "woff2",
      "eot",
      // Other binary formats
      "db",
      "sqlite",
      "sqlite3",
      "dat",
      "bin",
      "iso",
      "img",
    ]
    const extension = fileName.split(".").pop()?.toLowerCase()
    const fullName = fileName.toLowerCase()
    return (
      binaryExtensions.includes(extension ?? "") ||
      fullName.endsWith(".tar.gz") ||
      fullName.endsWith(".tar.bz2") ||
      fullName.endsWith(".tar.xz")
    )
  }

  // Check if file can be edited (only text files, not images or office files)
  canEditFile(fileName: string): boolean {
    if (!fileName) return false
    // Cannot edit binary files
    if (this.isBinaryFile(fileName)) return false
    // Cannot edit images
    if (this.isImageFile(fileName)) return false
    // Cannot edit office files
    if (this.isOfficeFile(fileName)) return false
    // Cannot edit archives
    if (this.isArchiveFile(fileName)) return false
    // Cannot edit executables
    if (this.isExecutableFile(fileName)) return false
    // Cannot edit PDFs
    if (this.isPdfFile(fileName)) return false
    // Cannot edit video files
    if (this.isVideoFile(fileName)) return false
    // Cannot edit audio files
    if (this.isAudioFile(fileName)) return false
    // Can only edit text files
    return this.isTextFile(fileName)
  }

  // Show download message for files that can't be previewed
  showDownloadMessage(file: any, message: string): void {
    this.currentViewingFile = file
    this.fileContent = message
    this.isViewingFile = true
  }

  // ENHANCED: Enhanced image source generation with better URL encoding
  getImageSrc(file: any): string {
    // For images, prefer the downloadUrl from GitHub API if available
    if (file.downloadUrl) {
      return file.downloadUrl
    }
    // Use the improved getFileDownloadUrl method as fallback
    return this.getFileDownloadUrl(file)
  }

  closeFileView(): void {
    this.showFileContent = false
    this.selectedFile = null
    this.fileContent = ""
    this.resetImageError()
  }

  // Back to file list from file view
  backToFiles(): void {
    this.isViewingFile = false
    this.currentViewingFile = null
    this.fileContent = ""
    this.isEditingFile = false
    this.editedFileContent = ""
    this.editCommitMessage = ""
    this.resetImageError()
  }

  // File editing methods
  startEditingFile(): void {
    if (this.currentViewingFile && !this.isBinaryFile(this.currentViewingFile.name)) {
      this.isEditingFile = true
      this.editedFileContent = this.fileContent
      this.editCommitMessage = `Update ${this.currentViewingFile.name}`
    }
  }

  cancelEditing(): void {
    this.isEditingFile = false
    this.editedFileContent = ""
    this.editCommitMessage = ""
  }

  saveFileChanges(): void {
    if (!this.currentViewingFile || !this.editCommitMessage.trim()) {
      alert("Please provide a commit message")
      return
    }

    this.isSavingFile = true
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      this.studentService
        .updateFile(
          owner,
          repoName,
          this.currentViewingFile.path,
          this.editedFileContent,
          this.editCommitMessage,
          this.currentViewingFile.sha,
          this.currentBranch,
        )
        .subscribe({
          next: (result: any) => {
            console.log("File updated successfully:", result)
            // Update the local file content
            this.fileContent = this.editedFileContent
            this.currentViewingFile.sha = result.content?.sha || this.currentViewingFile.sha
            // Exit edit mode
            this.isEditingFile = false
            this.editedFileContent = ""
            this.editCommitMessage = ""
            this.isSavingFile = false
            // Refresh the file list to show updated commit info
            this.refreshFileList()
            alert("File updated successfully!")
          },
          error: (error: any) => {
            console.error("Error updating file:", error)
            this.isSavingFile = false
            alert("Failed to update file. Please try again.")
          },
        })
    }
  }

  // File replacement methods
  openReplaceModal(): void {
    if (this.currentViewingFile) {
      this.showReplaceModal = true
      this.selectedReplaceFile = null
      this.replaceCommitMessage = `Replace ${this.currentViewingFile.name}`
    }
  }

  closeReplaceModal(): void {
    this.showReplaceModal = false
    this.selectedReplaceFile = null
    this.replaceCommitMessage = ""
  }

  onReplaceFileSelect(event: any): void {
    const files = event.target.files
    if (files && files.length > 0) {
      this.selectedReplaceFile = files[0]
      console.log("Replace file selected:", this.selectedReplaceFile?.name)
    }
  }

  replaceFile(): void {
    if (!this.selectedReplaceFile || !this.replaceCommitMessage.trim()) {
      alert("Please select a file and provide a commit message")
      return
    }

    if (!this.currentViewingFile) {
      alert("No file selected for replacement")
      return
    }

    this.isReplacingFile = true
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      // Use uploadFile method which handles file replacement properly
      this.studentService
        .uploadFile(
          owner,
          repoName,
          this.selectedReplaceFile,
          this.currentViewingFile.path,
          this.replaceCommitMessage,
          this.currentBranch,
        )
        .subscribe({
          next: (result: any) => {
            console.log("File replaced successfully:", result)
            // Update the local file content if it's a text file
            if (!this.isBinaryFile(this.selectedReplaceFile!.name)) {
              // Read the file content to update the view
              const reader = new FileReader()
              reader.onload = () => {
                this.fileContent = reader.result as string
              }
              reader.readAsText(this.selectedReplaceFile!)
            }
            // Update file info
            this.currentViewingFile.sha = result.content?.sha || this.currentViewingFile.sha
            this.currentViewingFile.name = this.selectedReplaceFile!.name
            // Close modal and reset state
            this.closeReplaceModal()
            this.isReplacingFile = false
            // Refresh the file list
            this.refreshFileList()
            alert("File replaced successfully!")
          },
          error: (error: any) => {
            console.error("Error replacing file:", error)
            console.error("Full error details:", JSON.stringify(error, null, 2))
            this.isReplacingFile = false
            let errorMessage = "Failed to replace file. Please try again."
            if (error.error?.message) {
              errorMessage = `Failed to replace file: ${error.error.message}`
            } else if (error.message) {
              errorMessage = `Failed to replace file: ${error.message}`
            }
            alert(errorMessage)
          },
        })
    }
  }

  // File deletion methods
  openDeleteModal(): void {
    if (this.currentViewingFile) {
      this.showDeleteModal = true
      this.deleteCommitMessage = `Delete ${this.currentViewingFile.name}`
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false
    this.deleteCommitMessage = ""
  }

  deleteFile(): void {
    if (!this.deleteCommitMessage.trim()) {
      alert("Please provide a commit message")
      return
    }

    if (!this.currentViewingFile) {
      alert("No file selected for deletion")
      return
    }

    this.isDeletingFile = true
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      this.studentService
        .deleteFile(
          owner,
          repoName,
          this.currentViewingFile.path,
          this.deleteCommitMessage,
          this.currentViewingFile.sha,
          this.currentBranch,
        )
        .subscribe({
          next: (result: any) => {
            console.log("File deleted successfully:", result)
            // Close modal and reset state
            this.closeDeleteModal()
            this.isDeletingFile = false
            // Go back to file list since the file no longer exists
            this.backToFiles()
            // Refresh the file list
            this.refreshFileList()
            alert("File deleted successfully!")
          },
          error: (error: any) => {
            console.error("Error deleting file:", error)
            console.error("Full error details:", JSON.stringify(error, null, 2))
            this.isDeletingFile = false
            let errorMessage = "Failed to delete file. Please try again."
            if (error.error?.message) {
              errorMessage = `Failed to delete file: ${error.error.message}`
            } else if (error.message) {
              errorMessage = `Failed to delete file: ${error.message}`
            }
            alert(errorMessage)
          },
        })
    }
  }

  // Refresh file list after changes
  private refreshFileList(): void {
    if (!this.repository) return

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      const currentPath = this.currentPath.join("/")
      this.studentService.getRepositoryFiles(owner, repoName, currentPath, this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files)
          console.log("File list refreshed successfully")
        },
        error: (error: any) => {
          console.error("Error refreshing file list:", error)
        },
      })
    }
  }

  navigateToPath(index: number): void {
    const newPath = this.currentPath.slice(0, index + 1).join("/")
    this.navigateToFolder(newPath)
  }

  navigateToRoot(): void {
    this.currentPath = []
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      this.studentService.getRepositoryFiles(owner, repoName, "", this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files)
        },
        error: (error) => {
          console.error("Error loading root files:", error)
        },
      })
    }
  }

  navigateToRootWithCallback(callback: () => void): void {
    console.log("=== NAVIGATE TO ROOT WITH CALLBACK ===")
    this.currentPath = []
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    console.log("Owner:", owner)
    console.log("Repo name:", repoName)
    console.log("Current branch for API call:", this.currentBranch)

    if (owner && repoName) {
      console.log("Making API call to getRepositoryFiles with branch:", this.currentBranch)
      this.studentService.getRepositoryFiles(owner, repoName, "", this.currentBranch).subscribe({
        next: (files: any[]) => {
          console.log("Received files for branch", this.currentBranch, ":", files)
          this.repositoryFiles = this.processFileData(files)
          console.log("Processed files:", this.repositoryFiles)
          callback() // Call the callback when done
        },
        error: (error) => {
          console.error("Error loading root files:", error)
          callback() // Call callback even on error
        },
      })
    } else {
      console.log("No owner/repo found, calling callback")
      callback() // Call callback if no owner/repo
    }
  }

  // Fixed branch operations
  onBranchModelChange(selectedBranch: string): void {
    console.log("=== BRANCH MODEL CHANGE ===")
    console.log("Selected branch:", selectedBranch)
    console.log("Current branch:", this.currentBranch)

    if (selectedBranch && selectedBranch !== this.currentBranch) {
      // Clear cache for fresh load
      this.branchFilesCache.delete(selectedBranch)
      this.branchCommitsCache.delete(selectedBranch)
      this.switchToBranch(selectedBranch)
    }
  }

  // Fixed branch switching method
  switchToBranch(branchName: string): void {
    console.log("=== SWITCHING TO BRANCH ===")
    console.log("Target branch:", branchName)
    console.log("Current branch:", this.currentBranch)

    if (this.branchSwitching) {
      console.log("Branch switching already in progress, ignoring")
      return
    }

    // Set switching state
    this.branchSwitching = true

    // Clear current view state immediately
    this.isViewingFile = false
    this.currentViewingFile = null
    this.fileContent = ""
    this.currentPath = []

    // Update current branch FIRST
    this.currentBranch = branchName
    this.selectedUploadBranch = branchName

    // Clear files array to show loading state
    this.repositoryFiles = []

    // Force change detection immediately
    this.cdr.markForCheck()
    this.cdr.detectChanges()

    // Load branch content
    this.loadBranchFiles(branchName)
  }

  // Fixed branch files loading
  private loadBranchFiles(branchName: string): void {
    console.log("=== LOADING BRANCH FILES ===")
    console.log("Branch:", branchName)

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (!owner || !repoName) {
      console.error("Missing owner or repo name")
      this.branchSwitching = false
      this.cdr.detectChanges()
      return
    }

    console.log("Loading files from API for branch:", branchName)
    this.studentService.getRepositoryFiles(owner, repoName, "", branchName).subscribe({
      next: (files: any[]) => {
        console.log("Loaded files for branch", branchName, "- count:", files.length)
        // Process and update files
        this.repositoryFiles = this.processFileData(files)
        // Update cache
        this.branchFilesCache.set(branchName, files)
        // Update branches list
        this.getAllBranches()
        // Load latest commit for this branch
        this.loadLatestCommitForBranch(branchName)
        // Update stats
        this.refreshDynamicStats()
        // Reset switching state
        this.branchSwitching = false
        // Force change detection
        this.cdr.markForCheck()
        this.cdr.detectChanges()

        console.log("Branch switch completed. Current branch:", this.currentBranch)
        console.log("Files displayed:", this.repositoryFiles.length)
        console.log("Repository files array:", this.repositoryFiles)
      },
      error: (error) => {
        console.error("Error loading files for branch:", branchName, error)
        this.branchSwitching = false
        this.cdr.detectChanges()
        alert(`Failed to load files for branch: ${branchName}`)
      },
    })
  }

  private loadLatestCommitForBranch(branchName: string): void {
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      console.log("Loading latest commit for branch:", branchName)
      this.studentService.getRepositoryCommits(owner, repoName, branchName, 1, 1).subscribe({
        next: (commits: any[]) => {
          if (commits && commits.length > 0) {
            const latestCommit = commits[0]
            const rawDate = latestCommit.date ?? latestCommit.authorDate ?? latestCommit.committerDate
            const processedCommit = {
              message: latestCommit.message,
              author: latestCommit.authorName ?? latestCommit.author ?? latestCommit.githubAuthorLogin,
              date: this.formatDate(rawDate),
              rawDate: rawDate,
              sha: latestCommit.sha?.substring(0, 7) ?? "unknown",
              url: latestCommit.htmlUrl,
              avatarUrl: latestCommit.githubAuthorAvatarUrl ?? latestCommit.authorAvatarUrl,
            }

            // Update current commit and cache it
            this.latestCommit = processedCommit
            this.branchCommitsCache.set(branchName, processedCommit)
            console.log("Loaded and cached latest commit for branch:", branchName)
            this.cdr.detectChanges()
          }
        },
        error: (error) => {
          console.error("Error loading latest commit for branch:", branchName, error)
        },
      })
    }
  }

  // Commit operations - ONLY way to view commit history
  showCommitHistoryView(): void {
    if (!this.repository) return

    // Extract owner name properly based on backend structure
    console.log("Repository object:", this.repository)
    console.log("Repository.owner:", this.repository.owner)
    console.log("Repository.ownerName:", this.repository.ownerName)
    console.log("Repository.fullName:", this.repository.fullName)

    let owner = null

    // Based on backend code analysis, try these approaches in order:
    if (this.repository.owner && typeof this.repository.owner === "object" && this.repository.owner.login) {
      // GitHub data available: owner is an object with login property
      owner = this.repository.owner.login
      console.log("Using owner.login:", owner)
    } else if (this.repository.ownerName && typeof this.repository.ownerName === "string") {
      // Database-only data: ownerName is a string
      owner = this.repository.ownerName
      console.log("Using ownerName:", owner)
    } else if (this.repository.fullName && typeof this.repository.fullName === "string") {
      // Fallback: extract from fullName (owner/repo format)
      owner = this.repository.fullName.split("/")[0]
      console.log("Using fullName split:", owner)
    } else if (typeof this.repository.owner === "string") {
      // Edge case: owner is directly a string
      owner = this.repository.owner
      console.log("Using owner as string:", owner)
    }

    const repo = this.repository.name

    console.log("Extracted owner:", owner, "type:", typeof owner)
    console.log("Extracted repo:", repo, "type:", typeof repo)

    // Validate that owner and repo are strings, not objects
    if (typeof owner !== "string" || typeof repo !== "string") {
      console.error("Owner or repo is not a string:", { owner: typeof owner, repo: typeof repo })
      alert("Error: Unable to determine repository owner and name. Please refresh the page.")
      return
    }

    if (owner && repo) {
      console.log("Navigating with params:", { owner, repo, branch: this.currentBranch })
      // Navigate to a new page for commit history
      this.router.navigate(["/student/repositories", this.repository.id, "commits"], {
        queryParams: { owner, repo, branch: this.currentBranch },
      })
    } else {
      console.error("Missing owner or repo for navigation:", { owner, repo })
      alert("Error: Missing repository information. Please refresh the page.")
    }
  }

  private loadCommitHistoryData(): void {
    if (!this.repository) return

    const owner = this.repository.owner || this.repository.ownerName
    const repo = this.repository.name

    if (!owner || !repo) {
      console.error("Missing owner or repo name for loading commits")
      return
    }

    // Load all commits for history view
    this.studentService.getRepositoryCommits(owner, repo, this.currentBranch, 1, 100).subscribe({
      next: (commits: any[]) => {
        this.commits = commits
        this.processCommitData(commits)
        this.showCommitHistory = true
      },
      error: (error) => {
        console.error("Error loading commit history:", error)
        this.commits = []
        this.showCommitHistory = true
      },
    })
  }

  closeCommitHistory(): void {
    this.showCommitHistory = false
  }

  selectCommitFromHistory(commit: any): void {
    // Load detailed commit information with diff data
    this.loadCommitDetails(commit)
  }

  private loadCommitDetails(commit: any): void {
    if (!this.repository) return

    const owner = this.repository.owner || this.repository.ownerName
    const repo = this.repository.name

    if (!owner || !repo || !commit.sha) {
      console.error("Missing required data for loading commit details")
      return
    }

    // Fetch detailed commit information with diff data from GitHub API
    this.studentService.getCommitDetails(owner, repo, commit.sha).subscribe({
      next: (commitDetails: any) => {
        this.selectedCommit = {
          ...commit,
          ...commitDetails,
          shortSha: commitDetails.sha?.substring(0, 7) || commit.shortSha,
          author: commitDetails.githubAuthorLogin || commitDetails.authorName || commit.author,
          files: commitDetails.files || [],
        }
        this.showCommitHistory = false
        this.showCommitDetails = true
      },
      error: (error) => {
        console.error("Error loading commit details:", error)
        // Fallback to basic commit data
        this.selectedCommit = {
          ...commit,
          shortSha: commit.sha?.substring(0, 7) || commit.shortSha,
          files: [],
        }
        this.showCommitHistory = false
        this.showCommitDetails = true
      },
    })
  }

  getCommitsByDate(): any[] {
    if (!this.commits || this.commits.length === 0) {
      return []
    }

    const groupedCommits: { [key: string]: any[] } = {}

    this.commits.forEach((commit) => {
      const date = this.formatCommitDate(commit.rawDate)
      if (!groupedCommits[date]) {
        groupedCommits[date] = []
      }
      groupedCommits[date].push(commit)
    })

    return Object.keys(groupedCommits)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => ({
        date: date,
        commits: groupedCommits[date],
      }))
  }

  formatCommitDate(dateString: string): string {
    if (!dateString) return "Unknown date"

    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  toggleFileDiff(change: any): void {
    change.expanded = !change.expanded
  }

  parseDiffLines(diff: string): any[] {
    if (!diff) return []

    const lines = diff.split("\n")
    const parsedLines: any[] = []
    let oldLineNumber = 1
    let newLineNumber = 1

    for (const line of lines) {
      if (line.startsWith("@@")) {
        // Parse hunk header to get line numbers
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
        if (match) {
          oldLineNumber = Number.parseInt(match[1])
          newLineNumber = Number.parseInt(match[2])
        }
        parsedLines.push({
          type: "hunk",
          content: line,
          oldLineNumber: null,
          newLineNumber: null,
        })
      } else if (line.startsWith("+")) {
        parsedLines.push({
          type: "addition",
          content: line.substring(1),
          oldLineNumber: null,
          newLineNumber: newLineNumber++,
        })
      } else if (line.startsWith("-")) {
        parsedLines.push({
          type: "deletion",
          content: line.substring(1),
          oldLineNumber: oldLineNumber++,
          newLineNumber: null,
        })
      } else if (line.startsWith(" ") || line === "") {
        parsedLines.push({
          type: "context",
          content: line.substring(1),
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++,
        })
      }
    }

    return parsedLines
  }

  getDiffLineClass(line: any): string {
    switch (line.type) {
      case "addition":
        return "diff-addition"
      case "deletion":
        return "diff-deletion"
      case "hunk":
        return "diff-hunk"
      default:
        return "diff-context"
    }
  }

  getDiffMarker(line: any): string {
    switch (line.type) {
      case "addition":
        return "+"
      case "deletion":
        return "-"
      case "hunk":
        return ""
      default:
        return " "
    }
  }

  getAdditionsPercentage(): number {
    const details = this.getCommitDetails()
    const total = details.stats.additions + details.stats.deletions
    return total > 0 ? (details.stats.additions / total) * 100 : 0
  }

  getDeletionsPercentage(): number {
    const details = this.getCommitDetails()
    const total = details.stats.additions + details.stats.deletions
    return total > 0 ? (details.stats.deletions / total) * 100 : 0
  }

  getCommitDetails() {
    if (!this.selectedCommit) {
      return {
        sha: "unknown",
        message: "No commit selected",
        author: "Unknown",
        date: "Unknown",
        changes: [],
        stats: {
          additions: 0,
          deletions: 0,
          changedFiles: 0,
        },
      }
    }

    // Use real commit data from GitHub API
    const files = this.selectedCommit.files || []
    const changes = files.map((file: any) => ({
      file: file.filename || file.name || "Unknown file",
      type: file.status || "modified",
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      isBinary: file.binary || false,
      expanded: false,
      diff: file.patch || "No diff available",
    }))

    const totalAdditions = files.reduce((sum: number, file: any) => sum + (file.additions || 0), 0)
    const totalDeletions = files.reduce((sum: number, file: any) => sum + (file.deletions || 0), 0)

    return {
      sha: this.selectedCommit.shortSha || this.selectedCommit.sha?.substring(0, 7) || "unknown",
      message: this.selectedCommit.message || "No commit message",
      author: this.selectedCommit.author || this.selectedCommit.authorName || "Unknown",
      date: this.selectedCommit.date || "Unknown date",
      changes: changes,
      stats: {
        additions: totalAdditions,
        deletions: totalDeletions,
        changedFiles: files.length,
      },
    }
  }

  // Simple File Upload functionality
  // Upload Modal functionality
  openUploadModal(): void {
    this.showUploadModal = true
    this.selectedUploadBranch = this.currentBranch // Use the currently selected branch
    this.uploadCommitMessage = "Add files via upload"
  }

  closeUploadModal(): void {
    this.showUploadModal = false
    // Don't clear selectedFiles here - we need them for upload
  }

  onFileSelect(event: any): void {
    const files = event.target.files
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files)
      console.log("Files selected:", this.selectedFiles.length)
      // After files are selected, open the modal to set commit message
      this.selectedUploadBranch = this.currentBranch // Use the currently selected branch
      this.uploadCommitMessage = "Add files via upload"
      this.showUploadModal = true
    }
  }

  onModalFileSelect(event: any): void {
    const files = event.target.files
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files)
      console.log("Files selected from modal:", this.selectedFiles.length)
      // Set default commit message and branch
      this.selectedUploadBranch = this.currentBranch
      this.uploadCommitMessage = "Add files via upload"
    }
  }

  uploadSelectedFiles(): void {
    console.log("uploadSelectedFiles called")
    console.log("selectedFiles length:", this.selectedFiles.length)
    console.log("selectedFiles:", this.selectedFiles)

    if (this.selectedFiles.length === 0) {
      console.error("No files selected when trying to upload")
      alert("Please select files to upload")
      return
    }

    console.log("Proceeding with upload of", this.selectedFiles.length, "files")
    this.closeUploadModal()

    // Store files in a local variable before clearing
    const filesToUpload = [...this.selectedFiles]
    this.selectedFiles = [] // Clear the array now
    this.handleFileUpload(filesToUpload)
  }

  // ENHANCED: Enhanced file download methods with better URL generation and special character handling
  generateDownloadUrls(file: any): string[] {
    if (!file || !this.repository) {
      console.warn("generateDownloadUrls: Missing file or repository")
      return []
    }

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]
    const branch = this.currentBranch || "main"

    if (!owner || !repoName) {
      console.warn("generateDownloadUrls: Missing owner or repo name")
      return []
    }

    // Use the file path directly, or construct it
    let filePath = file.path
    if (!filePath) {
      // If no path, use just the filename
      filePath = file.name
      // If we're in a subfolder, add the current path
      if (this.currentPath && this.currentPath.length > 0) {
        filePath = `${this.currentPath.join("/")}/${file.name}`
      }
    }

    // Clean up the path
    filePath = filePath.replace(/^\/+/, "") // Remove leading slashes
    filePath = filePath.replace(/\/+/g, "/") // Replace multiple slashes with single

    // ENHANCED: Properly encode the file path for URL with special character handling
    const encodedPath = filePath
      .split("/")
      .map((segment: string) => {
        // Handle special characters properly for GitHub URLs
        return encodeURIComponent(segment)
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29")
          .replace(/\s/g, "%20")
          .replace(/'/g, "%27")
          .replace(/"/g, "%22")
          .replace(/\[/g, "%5B")
          .replace(/\]/g, "%5D")
          .replace(/\{/g, "%7B")
          .replace(/\}/g, "%7D")
          .replace(/\|/g, "%7C")
          .replace(/\\/g, "%5C")
          .replace(/\^/g, "%5E")
          .replace(/`/g, "%60")
      })
      .join("/")

    // Try multiple URL formats for better compatibility
    const urls = [
      // Primary: GitHub raw content URL
      `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${encodedPath}`,
      // Secondary: GitHub blob raw URL
      `https://github.com/${owner}/${repoName}/raw/${branch}/${encodedPath}`,
      // Tertiary: Try with different encoding approach
      `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${encodeURIComponent(filePath)}`,
      // Quaternary: Try with main branch if different
      branch !== "main" ? `https://raw.githubusercontent.com/${owner}/${repoName}/main/${encodedPath}` : null,
      // Quinary: Try with master branch
      `https://raw.githubusercontent.com/${owner}/${repoName}/master/${encodedPath}`,
      // Alternative: Use file's downloadUrl if available
      file.downloadUrl,
    ].filter(Boolean) as string[]

    console.log("Generated download URLs for", file.name, ":", urls)
    console.log("File object:", file)
    console.log("Repository:", { owner, repoName, branch })
    console.log("Original file path:", file.path)
    console.log("Constructed file path:", filePath)
    console.log("Encoded file path:", encodedPath)

    return urls
  }

  getFileDownloadUrl(file: any): string {
    // For images and direct access, try to use the file's downloadUrl first
    if (file.downloadUrl) {
      return file.downloadUrl
    }

    // Fallback to generated URLs for compatibility
    const urls = this.generateDownloadUrls(file)
    return urls.length > 0 ? urls[0] : ""
  }

  // ENHANCED: Enhanced download method using backend service for better reliability
  async downloadFile(file: any): Promise<void> {
    if (!file) return

    // Clear any previous download errors
    this.downloadError = null
    this.downloadProgress[file.name] = true

    const owner = this.repository?.owner?.login ?? this.repository?.fullName?.split("/")[0]
    const repoName = this.repository?.name ?? this.repository?.fullName?.split("/")[1]
    const branch = this.currentBranch || "main"

    if (!owner || !repoName) {
      this.downloadError = "Repository information is missing"
      this.downloadProgress[file.name] = false
      return
    }

    // Use the file path directly, or construct it
    let filePath = file.path
    if (!filePath) {
      filePath = file.name
      if (this.currentPath && this.currentPath.length > 0) {
        filePath = `${this.currentPath.join("/")}/${file.name}`
      }
    }

    console.log("Downloading file:", file.name, "from path:", filePath)

    try {
      // Use the backend service to get file content
      const fileContent = await this.studentService.getFileContent(owner, repoName, filePath, branch).toPromise()

      if (fileContent && fileContent.content) {
        // Decode base64 content for binary files
        let content: string | Uint8Array
        if (fileContent.encoding === 'base64') {
          // For binary files, convert base64 to binary
          const binaryString = atob(fileContent.content.replace(/\s/g, ''))
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          content = bytes
        } else {
          // For text files, use content directly
          content = fileContent.content
        }

        // Create blob and download
        const blob = new Blob([content], { type: 'application/octet-stream' })
        this.createDownloadFromBlob(blob, file.name)

        console.log(`File downloaded successfully: ${file.name}`)
      } else {
        throw new Error("No content received from server")
      }
    } catch (error) {
      console.error("Download failed:", error)
      this.downloadError = `Failed to download ${file.name}. ${error instanceof Error ? error.message : 'Unknown error'}`
    } finally {
      this.downloadProgress[file.name] = false
    }
  }



  private createDownloadFromBlob(blob: Blob, fileName: string): void {
    try {
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName || "download"

      // Add to DOM temporarily
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up blob URL
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
      console.log(`File downloaded successfully: ${fileName}`)
    } catch (error) {
      console.error(`Error creating download for ${fileName}:`, error)
    }
  }

  private handleFileUpload(files: File[]): void {
    if (!this.repository) {
      console.error("No repository selected")
      return
    }

    // Validate files
    if (!files || files.length === 0) {
      console.error("No files provided for upload")
      alert("Please select files to upload")
      return
    }

    // Check for empty files
    const emptyFiles = files.filter((file) => file.size === 0)
    if (emptyFiles.length > 0) {
      console.error(
        "Empty files detected:",
        emptyFiles.map((f) => f.name),
      )
      alert("Cannot upload empty files: " + emptyFiles.map((f) => f.name).join(", "))
      return
    }

    // Check file size limits (GitHub has a 100MB limit)
    const largeFiles = files.filter((file) => file.size > 100 * 1024 * 1024)
    if (largeFiles.length > 0) {
      console.error(
        "Files too large:",
        largeFiles.map((f) => `${f.name} (${f.size} bytes)`),
      )
      alert("Files too large (max 100MB): " + largeFiles.map((f) => f.name).join(", "))
      return
    }

    // Get owner and repo name from repository data (loaded via ID)
    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    console.log("Repository data for upload:", {
      repository: this.repository,
      owner: owner,
      repoName: repoName,
      fullName: this.repository.fullName,
      ownerLogin: this.repository.owner?.login,
      name: this.repository.name,
      routeId: this.route.snapshot.paramMap.get("id"),
    })

    if (!owner || !repoName) {
      console.error("Unable to determine repository owner and name from repository data")
      console.error("Repository object:", this.repository)
      return
    }

    this.isUploading = true

    // Get current path for upload
    const basePath = this.currentPath.join("/")

    // Ensure branch is set correctly
    if (!this.selectedUploadBranch || this.selectedUploadBranch.trim() === "") {
      this.selectedUploadBranch = this.repository?.defaultBranch || "main"
      console.warn("Upload branch was empty, defaulting to:", this.selectedUploadBranch)
    }

    console.log("Upload parameters:", {
      owner,
      repoName,
      basePath,
      uploadCommitMessage: this.uploadCommitMessage,
      selectedUploadBranch: this.selectedUploadBranch,
      filesCount: files.length,
      repositoryDefaultBranch: this.repository?.defaultBranch,
      currentBranch: this.currentBranch,
    })

    // Force single file upload for debugging - upload files one by one
    console.log("Processing files one by one for debugging...")
    this.uploadFilesSequentially(files, owner, repoName, basePath, 0)
  }

  private uploadFilesSequentially(
    files: File[],
    owner: string,
    repoName: string,
    basePath: string,
    index: number,
  ): void {
    if (index >= files.length) {
      // All files uploaded
      console.log("All files uploaded successfully")
      this.refreshCurrentPath()
      this.isUploading = false
      this.uploadCommitMessage = "Add files via upload"
      return
    }

    const file = files[index]
    const filePath = basePath ? `${basePath}/${file.name}` : file.name

    console.log(`Uploading file ${index + 1}/${files.length}:`, { filePath, fileName: file.name, fileSize: file.size })

    this.studentService
      .uploadFile(owner, repoName, file, filePath, this.uploadCommitMessage, this.selectedUploadBranch)
      .subscribe({
        next: (result) => {
          console.log(`File ${index + 1}/${files.length} uploaded successfully:`, result)
          // Upload next file
          this.uploadFilesSequentially(files, owner, repoName, basePath, index + 1)
        },
        error: (error) => {
          console.error(`Error uploading file ${index + 1}/${files.length}:`, error)
          console.error("Full error object:", JSON.stringify(error, null, 2))
          console.error("Error details:", {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url,
          })

          // Log the server error response if available
          if (error.error) {
            console.error("Server error response:", error.error)
            if (typeof error.error === "object") {
              console.error("Server error keys:", Object.keys(error.error))
              console.error("Server error values:", Object.values(error.error))
            }
          }

          // Show user-friendly error message
          let errorMessage = `Failed to upload file: ${file.name}`
          if (error.error && error.error.error) {
            errorMessage = error.error.error
          } else if (error.error && typeof error.error === "string") {
            errorMessage = error.error
          } else if (error.status === 401) {
            errorMessage = "Authentication failed. Please check your GitHub connection."
          } else if (error.status === 403) {
            errorMessage = "Access denied. You may not have permission to upload to this repository."
          } else if (error.status === 404) {
            errorMessage = "Repository not found or branch does not exist."
          } else if (error.status === 400) {
            errorMessage = "Bad request. Please check your file and try again."
          }

          alert("Upload failed: " + errorMessage)
          this.isUploading = false
        },
      })
  }

  private refreshCurrentPath(): void {
    if (!this.repository) {
      console.error("No repository data available for refresh")
      return
    }

    const owner = this.repository.owner?.login ?? this.repository.fullName?.split("/")[0]
    const repoName = this.repository.name ?? this.repository.fullName?.split("/")[1]

    if (owner && repoName) {
      const path = this.currentPath.join("/")
      console.log("Refreshing file list:", { owner, repoName, path, branch: this.currentBranch })

      this.studentService.getRepositoryFiles(owner, repoName, path, this.currentBranch).subscribe({
        next: (files: any[]) => {
          this.repositoryFiles = this.processFileData(files)
          console.log("File list refreshed successfully")
        },
        error: (error) => {
          console.error("Error refreshing file list:", error)
        },
      })
    } else {
      console.error("Unable to determine owner/repo for refresh:", { owner, repoName, repository: this.repository })
    }
  }

  // ENHANCED: Enhanced image handling methods with better error handling
  onImageError(event: any): void {
    console.error("Image failed to load:", this.currentViewingFile?.name)
    console.error("Image URL:", this.getFileDownloadUrl(this.currentViewingFile))
    console.error("Repository info:", {
      owner: this.repository?.owner?.login,
      name: this.repository?.name,
      branch: this.currentBranch,
      filePath: this.currentViewingFile?.path,
      fileName: this.currentViewingFile?.name,
    })

    // Try alternative URL formats
    this.tryAlternativeImageUrl(event.target)
  }

  onImageLoad(event: any): void {
    console.log("Image loaded successfully:", this.currentViewingFile?.name)
    this.imageLoadError = false
  }

  private tryAlternativeImageUrl(imgElement: any): void {
    if (!this.currentViewingFile || !this.repository) {
      this.imageLoadError = true
      return
    }

    // Get multiple alternative URLs
    const alternatives = this.generateDownloadUrls(this.currentViewingFile)

    // Try the first alternative that hasn't been tried yet
    const currentSrc = imgElement.src
    const nextUrl = alternatives.find((url) => url !== currentSrc)

    if (nextUrl) {
      console.log("Trying alternative image URL:", nextUrl)
      imgElement.src = nextUrl
    } else {
      console.error("All alternative URLs failed")
      this.imageLoadError = true
    }
  }

  // Reset image error state when opening a new file
  resetImageError(): void {
    this.imageLoadError = false
  }

  // Get languages array for display
  getLanguageArray(): any[] {
    if (!this.repository?.languages) {
      return []
    }

    const languages = this.repository.languages
    const total = Object.values(languages).reduce((sum: number, bytes: any) => sum + bytes, 0)

    const languageColors: { [key: string]: string } = {
      JavaScript: "#f1e05a",
      TypeScript: "#2b7489",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Java: "#b07219",
      Python: "#3572A5",
      "C++": "#f34b7d",
      C: "#555555",
      "C#": "#239120",
      PHP: "#4F5D95",
      Ruby: "#701516",
      Go: "#00ADD8",
      Rust: "#dea584",
      Swift: "#ffac45",
      Kotlin: "#F18E33",
      Dart: "#00B4AB",
      Shell: "#89e051",
      PowerShell: "#012456",
      Dockerfile: "#384d54",
      YAML: "#cb171e",
      JSON: "#292929",
      XML: "#0060ac",
      Markdown: "#083fa1",
    }

    return Object.entries(languages)
      .map(([name, bytes]: [string, any]) => ({
        name,
        bytes,
        percentage: Math.round((bytes / total) * 100 * 10) / 10,
        color: languageColors[name] || "#858585",
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5) // Show top 5 languages
  }

  // New method to handle commit banner click
  onCommitBannerClick(): void {
    this.showCommitHistoryView()
  }

  // New method to copy commit SHA
  copyCommitSha(): void {
    if (this.latestCommit && this.latestCommit.sha) {
      this.copyToClipboard(this.latestCommit.sha)
      // You could show a toast notification here
      console.log("Commit SHA copied to clipboard")
    }
  }

  // Add these methods to the component class
  // Method to get file count (replaces inline filter)
  getFileCount(): number {
    return this.repositoryFiles ? this.repositoryFiles.filter((f) => f.type === "file").length : 0
  }

  // Method to get folder count
  getFolderCount(): number {
    return this.repositoryFiles ? this.repositoryFiles.filter((f) => f.type === "folder").length : 0
  }

  // Method to get total items count
  getTotalItemsCount(): number {
    return this.repositoryFiles ? this.repositoryFiles.length : 0
  }

  // Method to get contributors count
  getContributorsCount(): number {
    return this.getAllContributors().length
  }

  // Method to get branches count
  getBranchesCount(): number {
    return this.getAllBranches().length
  }

  // Method to get top languages (limit to 5)
  getTopLanguages(): any[] {
    return this.fileTypes ? this.fileTypes.slice(0, 5) : []
  }

  // Method to get top contributors (limit to 5)
  getTopContributors(): any[] {
    return this.getAllContributors().slice(0, 5)
  }

  // ENHANCED: Method to check if file is currently being downloaded
  isFileDownloading(fileName: string): boolean {
    return this.downloadProgress[fileName] || false
  }

  // ENHANCED: Method to clear download error
  clearDownloadError(): void {
    this.downloadError = null
  }
}

