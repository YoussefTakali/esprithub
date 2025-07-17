import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

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
    return this.http.get<any[]>('http://localhost:8090/api/tasks');
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

  getMyStudents(): Observable<any[]> {
    // Replace with your actual backend endpoint
    return this.http.get<any[]>('http://localhost:8090/api/teacher/students');
  }

  getMyRepositories(): Observable<any[]> {
    // Replace with your actual backend endpoint
    return this.http.get<any[]>('http://localhost:8090/api/teacher/repositories');
  }

  // GROUP MANAGEMENT
  createGroup(group: any) {
    return this.http.post<any>('http://localhost:8090/api/groups', group);
  }

  updateGroup(groupId: string, group: any) {
    // group is expected to be in DTO format: { id, name, classeId, projectId, studentIds }
    return this.http.put<any>(`http://localhost:8090/api/groups/${groupId}`, group);
  }

  deleteGroup(groupId: string, deleteRepository: boolean = false) {
    const params = deleteRepository ? '?deleteRepository=true' : '';
    return this.http.delete<any>(`http://localhost:8090/api/groups/${groupId}${params}`);
  }

  getGroupsByProject(projectId: string) {
    return this.http.get<any[]>(`http://localhost:8090/api/groups?projectId=${projectId}`);
  }

  getGroupsByProjectAndClass(projectId: string, classeId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8090/api/groups/by-project-and-class?projectId=${projectId}&classeId=${classeId}`);
  }

  createTask(task: any) {
    return this.http.post<any>('http://localhost:8090/api/tasks', task);
  }

  updateTaskStatus(taskId: string, status: string) {
    return this.http.put<any>(`http://localhost:8090/api/tasks/${taskId}`, { status });
  }

  updateTaskVisibility(taskId: string, visible: boolean) {
    return this.http.put<any>(`http://localhost:8090/api/tasks/${taskId}`, { visible });
  }

  deleteTask(taskId: string) {
    return this.http.delete<any>(`http://localhost:8090/api/tasks/${taskId}`);
  }

  updateTask(taskId: string, update: any) {
    return this.http.put<any>(`http://localhost:8090/api/tasks/${taskId}`, update);
  }

  getDashboard(): Observable<any> {
    return this.http.get<any>('http://localhost:8090/api/teacher/dashboard');
  }

  // SUBMISSION AND GRADE MANAGEMENT
  getSubmissionsForTask(taskId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8090/api/submissions/task/${taskId}`);
  }

  getSubmissionsForProject(projectId: string): Observable<any[]> {
    // Get all tasks for the project first, then get submissions for each task
    return this.getTasksByProjectId(projectId).pipe(
      switchMap(tasks => {
        if (!tasks || tasks.length === 0) {
          return of([]);
        }

        const submissionRequests = tasks.map(task =>
          this.getSubmissionsForTask(task.id).pipe(
            map(submissions => submissions.map(sub => ({
              ...sub,
              taskId: task.id,
              taskTitle: task.title,
              taskType: task.type,
              taskGraded: task.graded
            }))),
            catchError(() => of([]))
          )
        );

        return forkJoin(submissionRequests).pipe(
          map(results => results.flat())
        );
      })
    );
  }
}
