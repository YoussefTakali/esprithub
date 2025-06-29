import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TeacherDataService {
  constructor(private readonly http: HttpClient) {}

  getMyClassesWithCourses(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8090/api/projects/my-classes-courses');
  }

  getMyProjects(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8090/api/teacher/projects');
  }

  getMyGroups(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8090/api/teacher/groups');
  }

  getMyTasks(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8090/api/teacher/tasks');
  }

  getTasksByClassId(classId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8090/api/tasks/by-class/${classId}`);
  }

  getTasksByProjectId(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8090/api/tasks/by-project/${projectId}`);
  }

  createProject(project: any) {
    return this.http.post<any>('http://localhost:8090/api/projects', project);
  }

  updateProject(project: any) {
    // Only send updatable fields as per ProjectUpdateDto
    const payload = {
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      classIds: project.classIds ?? (project.classes ? project.classes.map((c: any) => c.id ?? c.classId) : []),
      collaboratorIds: project.collaboratorIds ?? (project.collaborators ? project.collaborators.map((u: any) => u.id) : [])
    };
    return this.http.put<any>(`http://localhost:8090/api/projects/${project.id}`, payload);
  }

  deleteProject(projectId: string) {
    return this.http.delete<any>(`http://localhost:8090/api/projects/${projectId}`);
  }

  addCollaborator(projectId: string, userEmail: string) {
    return this.http.post<any>(`http://localhost:8090/api/projects/${projectId}/collaborators/${userEmail}`, {});
  }

  removeCollaborator(projectId: string, userId: string) {
    return this.http.delete<any>(`http://localhost:8090/api/projects/${projectId}/collaborators/${userId}`);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8090/api/v1/users');
  }

  getAllUserSummaries(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8090/api/v1/users/summary');
  }

  getMyClasses(): Observable<any[]> {
    // Use the new endpoint but map to only class info for legacy consumers
    return this.getMyClassesWithCourses().pipe(
      map(classesWithCourses => classesWithCourses.map(c => ({
        id: c.classId,
        nom: c.className
      })))
    );
  }

  getStudentsByClassId(classId: string): Observable<any[]> {
    // Updated to use the correct backend endpoint for group creation
    return this.http.get<any[]>(`http://localhost:8090/api/v1/users/classes/${classId}/students`);
  }
}
