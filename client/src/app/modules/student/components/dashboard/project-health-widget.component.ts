import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-project-health-widget',
  template: `
    <div style="background: yellow; color: black; padding: 20px; text-align: center; font-size: 1.5rem;">TEST WIDGET</div>
    <div class="project-health-widget">
      <div class="health-icon" [ngClass]="healthColor">
        <span *ngIf="healthColor === 'good'">😃</span>
        <span *ngIf="healthColor === 'warning'">😐</span>
        <span *ngIf="healthColor === 'bad'">😟</span>
      </div>
      <div class="health-label">
        <span *ngIf="healthColor === 'good'">Projet en bonne santé</span>
        <span *ngIf="healthColor === 'warning'">Attention : surveillez le rythme</span>
        <span *ngIf="healthColor === 'bad'">Projet en danger !</span>
      </div>
      <div class="health-details">
        <div>Tâches complétées : {{ completionRate }}%</div>
        <div>Participation : {{ participation }}%</div>
        <div>Soumissions à temps : {{ onTime }}%</div>
      </div>
    </div>
  `,
  styleUrls: ['./project-health-widget.component.css']
})
export class ProjectHealthWidgetComponent {
  @Input() completionRate = 0;
  @Input() participation = 0;
  @Input() onTime = 0;

  get healthColor(): 'good' | 'warning' | 'bad' {
    if (this.completionRate > 80 && this.participation > 70 && this.onTime > 80) return 'good';
    if (this.completionRate > 50 && this.participation > 40 && this.onTime > 50) return 'warning';
    return 'bad';
  }
} 