import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Departement, 
  CreateDepartement, 
  Niveau, 
  CreateNiveau, 
  Classe, 
  CreateClasse, 
  UserSummary,
  ApiResponse,
  DepartementSummary,
  NiveauSummary,
  CreateClasseSimple
} from '../models/academic.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  constructor(private readonly http: HttpClient) {}

  // ========== DEPARTMENT OPERATIONS ==========
  
  getAllDepartements(): Observable<Departement[]> {
    return this.http.get<Departement[]>(`${this.baseUrl}/admin/academic/departements`);
  }

  getActiveDepartements(): Observable<Departement[]> {
    return this.http.get<Departement[]>(`${this.baseUrl}/admin/academic/departements/active`);
  }

  getDepartementsWithStatistics(): Observable<Departement[]> {
    return this.http.get<Departement[]>(`${this.baseUrl}/admin/academic/departements/with-statistics`);
  }

  getDepartementById(id: string): Observable<Departement> {
    return this.http.get<Departement>(`${this.baseUrl}/admin/academic/departements/${id}`);
  }

  createDepartement(departement: CreateDepartement): Observable<Departement> {
    return this.http.post<Departement>(`${this.baseUrl}/admin/academic/departements`, departement);
  }

  updateDepartement(id: string, departement: Partial<CreateDepartement>): Observable<Departement> {
    return this.http.put<Departement>(`${this.baseUrl}/admin/academic/departements/${id}`, departement);
  }

  deleteDepartement(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/admin/academic/departements/${id}`);
  }

  activateDepartement(id: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/admin/academic/departements/${id}/activate`, {});
  }

  deactivateDepartement(id: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/admin/academic/departements/${id}/deactivate`, {});
  }

  assignChiefToDepartement(departementId: string, chiefId: string): Observable<Departement> {
    return this.http.post<Departement>(`${this.baseUrl}/admin/academic/departements/${departementId}/assign-chief/${chiefId}`, {});
  }

  removeChiefFromDepartement(departementId: string): Observable<Departement> {
    return this.http.delete<Departement>(`${this.baseUrl}/admin/academic/departements/${departementId}/remove-chief`);
  }

  // New summary endpoints for class creation workflow
  getDepartementsSummary(): Observable<DepartementSummary[]> {
    return this.http.get<DepartementSummary[]>(`${this.baseUrl}/admin/academic/departements/summary`);
  }

  getNiveauxSummaryByDepartement(departementId: string): Observable<NiveauSummary[]> {
    return this.http.get<NiveauSummary[]>(`${this.baseUrl}/admin/academic/departements/${departementId}/niveaux/summary`);
  }

  // ========== NIVEAU OPERATIONS ==========

  getAllNiveaux(): Observable<Niveau[]> {
    return this.http.get<Niveau[]>(`${this.baseUrl}/admin/academic/niveaux`);
  }

  getNiveauxByDepartement(departementId: string): Observable<Niveau[]> {
    return this.http.get<Niveau[]>(`${this.baseUrl}/admin/academic/departements/${departementId}/niveaux`);
  }

  getNiveauById(id: string): Observable<Niveau> {
    return this.http.get<Niveau>(`${this.baseUrl}/admin/academic/niveaux/${id}`);
  }

  createNiveau(niveau: CreateNiveau): Observable<Niveau> {
    return this.http.post<Niveau>(`${this.baseUrl}/admin/academic/niveaux`, niveau);
  }

  updateNiveau(id: string, niveau: Partial<CreateNiveau>): Observable<Niveau> {
    return this.http.put<Niveau>(`${this.baseUrl}/admin/academic/niveaux/${id}`, niveau);
  }

  deleteNiveau(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/admin/academic/niveaux/${id}`);
  }

  // ========== CLASSE OPERATIONS ==========

  getAllClasses(): Observable<Classe[]> {
    return this.http.get<Classe[]>(`${this.baseUrl}/admin/academic/classes`);
  }

  getClassesByDepartement(departementId: string): Observable<Classe[]> {
    return this.http.get<Classe[]>(`${this.baseUrl}/admin/academic/departements/${departementId}/classes`);
  }

  getClassesByNiveau(niveauId: string): Observable<Classe[]> {
    return this.http.get<Classe[]>(`${this.baseUrl}/admin/academic/niveaux/${niveauId}/classes`);
  }

  getClasseById(id: string): Observable<Classe> {
    return this.http.get<Classe>(`${this.baseUrl}/admin/academic/classes/${id}`);
  }

  createClasse(classe: CreateClasse): Observable<Classe> {
    return this.http.post<Classe>(`${this.baseUrl}/admin/academic/classes`, classe);
  }

  updateClasse(id: string, classe: Partial<CreateClasse>): Observable<Classe> {
    return this.http.put<Classe>(`${this.baseUrl}/admin/academic/classes/${id}`, classe);
  }

  deleteClasse(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/admin/academic/classes/${id}`);
  }

  // New endpoint for hierarchical class creation
  createClasseForNiveau(departementId: string, niveauId: string, createClasse: CreateClasseSimple): Observable<Classe> {
    return this.http.post<Classe>(`${this.baseUrl}/admin/academic/departements/${departementId}/niveaux/${niveauId}/classes`, createClasse);
  }

  // ========== ASSIGNMENT OPERATIONS ==========

  assignStudentsToClasse(classeId: string, studentIds: string[]): Observable<Classe> {
    return this.http.post<Classe>(`${this.baseUrl}/admin/academic/classes/${classeId}/students`, studentIds);
  }

  removeStudentsFromClasse(classeId: string, studentIds: string[]): Observable<Classe> {
    return this.http.delete<Classe>(`${this.baseUrl}/admin/academic/classes/${classeId}/students`, {
      body: studentIds
    });
  }

  assignTeachersToClasse(classeId: string, teacherIds: string[]): Observable<Classe> {
    return this.http.post<Classe>(`${this.baseUrl}/admin/academic/classes/${classeId}/teachers`, teacherIds);
  }

  removeTeachersFromClasse(classeId: string, teacherIds: string[]): Observable<Classe> {
    return this.http.delete<Classe>(`${this.baseUrl}/admin/academic/classes/${classeId}/teachers`, {
      body: teacherIds
    });
  }

  // ========== USER OPERATIONS ==========

  getUnassignedUsers(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.baseUrl}/admin/academic/users/unassigned`);
  }

  getUsersByRole(role: string): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.baseUrl}/admin/academic/users/role/${role}`);
  }
}
