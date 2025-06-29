import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { AuthService } from '../../services/auth.service';
import { TeacherDataService } from '../../modules/teacher/services/teacher-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnChanges, OnInit, OnDestroy {
  @Input() isSidebarVisible: boolean = false;

  userRole: string | null = null;
  userId: string | null = null;
  showLevels: boolean = false;
  showClasses: boolean = false;
  myClasses: any[] = [];
  private subscriptions: Subscription = new Subscription();

  constructor(
    public router: Router,
    private sidebarService: SidebarService,
    private authService: AuthService,
    private teacherData: TeacherDataService
  ) {}

  ngOnInit(): void {
    // Subscribe to user changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.userRole = user?.role?.toLowerCase() || null;
        this.userId = user?.id || null;
      })
    );

    // Subscribe to router events to update sidebar visibility
    this.subscriptions.add(
      this.router.events.subscribe(() => {
        this.updateSidebarState();
      })
    );
    
    // Subscribe to sidebar service state
    this.subscriptions.add(
      this.sidebarService.sidebarVisible$.subscribe(isVisible => {
        this.isSidebarVisible = isVisible;
      })
    );
    
    // Initial state update
    this.updateSidebarState();

    // Fetch teacher's classes if the user is a teacher
    if (this.userRole === 'teacher' || this.userRole === 'TEACHER') {
      this.teacherData.getMyClasses().subscribe(classes => {
        this.myClasses = classes;
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isSidebarVisible']) {
      console.log('Sidebar visibility changed:', this.isSidebarVisible);
    }
  }

  updateSidebarState(): void {
    const url = this.router.url;
    
    // Show levels if we're in a specialty context
    this.showLevels = url.includes('/specialties/') || url.includes('/levels');
    
    // Show classes if we're in a level context
    this.showClasses = url.includes('/levels/') || url.includes('/classes') || url.includes('/students');
  }

  isRootPath(): boolean {
    return this.router.url === '/' || this.router.url === '/specialties';
  }

  navigateToSpecialties(): void {
    this.router.navigate(['/specialties']);
    // Close sidebar on mobile after navigation
    this.closeSidebarOnMobile();
  }

  navigateToLevels(): void {
    // Extract specialty ID from current URL if available
    const url = this.router.url;
    const specialtyMatch = url.match(/\/specialties\/(\d+)/);
    if (specialtyMatch) {
      const specialtyId = specialtyMatch[1];
      this.router.navigate(['/levels', specialtyId]);
    } else {
      // If no specialty ID found, navigate to specialties first
      this.router.navigate(['/specialties']);
    }
    this.closeSidebarOnMobile();
  }

  navigateToClasses(): void {
    // Extract specialty and level IDs from current URL if available
    const url = this.router.url;
    const levelMatch = url.match(/\/levels\/(\d+)\/(\d+)/);
    if (levelMatch) {
      const specialtyId = levelMatch[1];
      const levelId = levelMatch[2];
      this.router.navigate(['/classes', specialtyId, levelId]);
    } else {
      // If no level ID found, navigate back to levels
      const specialtyMatch = url.match(/\/specialties\/(\d+)|\/levels\/(\d+)/);
      if (specialtyMatch) {
        const specialtyId = specialtyMatch[1] || specialtyMatch[2];
        this.router.navigate(['/levels', specialtyId]);
      } else {
        this.router.navigate(['/specialties']);
      }
    }
    this.closeSidebarOnMobile();
  }

  private closeSidebarOnMobile(): void {
    // Close sidebar on mobile devices after navigation
    if (window.innerWidth <= 737) {
      this.sidebarService.closeSidebar();
    }
  }
}