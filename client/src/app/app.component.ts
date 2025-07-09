import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from './services/sidebar.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'EspritHub';

  constructor(public sidebarService: SidebarService, public router: Router) {}

  isAuthPage(): boolean {
    // Add more routes if you want to hide navbar/sidebar on other pages
    return this.router.url === '/login' || this.router.url === '/register';
  }
}
