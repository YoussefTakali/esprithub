import { Component, OnInit } from '@angular/core';
import { AcademicService } from '../../../../shared/services/academic.service';
import { Classe } from '../../../../shared/models/academic.models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-department-classes',
  templateUrl: './department-classes.component.html',
  styleUrls: ['./department-classes.component.css']
})
export class DepartmentClassesComponent implements OnInit {
  classes: Classe[] = [];
  loading = true;
  error: string | null = null;

  constructor(private readonly academicService: AcademicService) {}

  ngOnInit(): void {
    this.loadClasses();
  }

  async loadClasses(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      // Load classes for the chief's department using chief endpoint
      const classes = await firstValueFrom(this.academicService.getMyDepartmentClasses());
      this.classes = classes ?? [];
    } catch (error) {
      console.error('Error loading classes:', error);
      this.error = 'Failed to load classes. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
