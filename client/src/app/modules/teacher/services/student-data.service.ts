import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StudentDataService {
  constructor(private readonly http: HttpClient) {}

  // Get all groups the student is part of
  getStudentGroups(studentEmail: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8090/api/student/groups?email=${studentEmail}`);
  }
}
