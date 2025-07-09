import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { User, CreateUser, UpdateUser, UserRole, ApiResponse } from '../models/academic.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/users`;

  // User state management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  setCurrentUser(user: User | null) {
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  constructor(private readonly http: HttpClient) {}

  // ========== CRUD OPERATIONS ==========

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  createUser(user: CreateUser): Observable<User> {
    return this.http.post<User>(this.baseUrl, user);
  }

  updateUser(id: string, user: UpdateUser): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  // ========== ASSIGNMENT OPERATIONS ==========

  assignUserToDepartment(userId: string, departmentId: string): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/${userId}/assign-department/${departmentId}`, {});
  }

  assignUserToClass(userId: string, classId: string): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/${userId}/assign-class/${classId}`, {});
  }

  removeUserFromClass(studentId: string): Observable<User> {
    return this.http.delete<User>(`${this.baseUrl}/${studentId}/classe`);
  }

  // ========== SEARCH AND FILTER ==========

  searchUsers(query: string): Observable<User[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<User[]>(`${this.baseUrl}/search`, { params });
  }

  getUsersByDepartment(departmentId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/department/${departmentId}`);
  }

  getUsersByRole(role: UserRole): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/role/${role}`);
  }

  getUsersByClass(classId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/classe/${classId}/students`);
  }

  // ========== CHIEF OPERATIONS ==========

  getMyDepartmentUsers(chiefId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/chief/${chiefId}/department/users`);
  }

  getMyDepartmentUsersByRole(chiefId: string, role: UserRole): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/chief/${chiefId}/department/users/role/${role}`);
  }
}
