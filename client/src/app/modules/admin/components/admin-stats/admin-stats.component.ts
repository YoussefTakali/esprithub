import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-stats',
  template: `
    <div class="admin-stats">
      <h2>Admin Statistics</h2>
      <p>Statistics and reports coming soon...</p>
    </div>
  `,
  styles: [`
    .admin-stats {
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h2 {
      color: #2c3e50;
      margin-bottom: 1rem;
    }
    p {
      color: #6c757d;
    }
  `]
})
export class AdminStatsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    // Admin stats initialization
  }

}
