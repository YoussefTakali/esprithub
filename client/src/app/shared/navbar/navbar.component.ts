import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { SidebarService } from 'src/app/services/sidebar.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private sidebarService: SidebarService
  ) {}

  isSidebarVisible = false;
  currentUser: User | null = null;
  dropdownOpen = false;
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  @Output() sidebarToggled = new EventEmitter<boolean>();

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  onHamburgerClick(event: Event): void {
    // Stop event propagation to prevent multiple triggers
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle the state
    this.isSidebarVisible = !this.isSidebarVisible;
    
    console.log('NavbarComponent: Emitting toggle request', this.isSidebarVisible);
    this.sidebarToggled.emit(this.isSidebarVisible);
    
    // Also update the service
    this.sidebarService.toggleSidebar(this.isSidebarVisible);
  }

  logout(): void {
    this.authService.logout();
  }

  editProfile(): void {
    // Navigate to a profile edit page or show a modal
    // Replace this with your actual profile editing logic
    this.router.navigate(['/profile']);
  }

  getUserDisplayName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return 'User';
  }

  getUserRole(): string {
    return this.currentUser?.role ?? '';
  }
}
