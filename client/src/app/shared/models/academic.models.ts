export enum UserRole {
  ADMIN = 'ADMIN',
  CHIEF = 'CHIEF',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export enum Specialites {
  INFORMATIQUE = 'INFORMATIQUE',
  TELECOMMUNICATIONS = 'TELECOMMUNICATIONS',
  ELECTROMECANIQUE = 'ELECTROMECANIQUE',
  GENIE_CIVIL = 'GENIE_CIVIL',
  GENIE_INDUSTRIEL = 'GENIE_INDUSTRIEL'
}

export enum TypeFormation {
  INGENIEUR = 'INGENIEUR',
  LICENCE = 'LICENCE',
  MASTERE = 'MASTERE',
  CYCLE_PREPARATOIRE = 'CYCLE_PREPARATOIRE'
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  githubUsername?: string;
  departementNom?: string;
  classeNom?: string;
}

// Summary DTOs for hierarchical class creation
export interface DepartementSummary {
  id: string;
  nom: string;
  code: string;
  specialite: string;
  typeFormation: string;
  isActive: boolean;
  totalNiveaux: number;
}

export interface NiveauSummary {
  id: string;
  nom: string;
  code: string;
  annee: number;
  isActive: boolean;
  departementId: string;
  departementNom: string;
  totalClasses: number;
}

export interface CreateClasseSimple {
  nom: string;
  description?: string;
  capacite: number;
  code?: string;
  isActive?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  githubUsername?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  departementId?: string;
  departementNom?: string;
  classeId?: string;
  classeNom?: string;
  fullName: string;
  canManageUsers: boolean;
}

export interface CreateUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUser {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface Departement {
  id: string;
  nom: string;
  description?: string;
  specialite: Specialites;
  typeFormation: TypeFormation;
  code: string;
  isActive: boolean;
  chiefId?: string;
  chiefName?: string;
  chiefEmail?: string;
  totalNiveaux: number;
  niveaux?: Niveau[];
}

export interface CreateDepartement {
  nom: string;
  description?: string;
  specialite: Specialites;
  typeFormation: TypeFormation;
}

export interface Niveau {
  id: string;
  nom: string;
  description?: string;
  annee: number;
  code: string;
  isActive: boolean;
  departementId: string;
  departementNom: string;
  totalClasses: number;
  classes?: Classe[];
}

export interface CreateNiveau {
  nom: string;
  description?: string;
  annee: number;
  departementId: string;
}

export interface Classe {
  id: string;
  nom: string;
  description?: string;
  capacite: number;
  code: string;
  isActive: boolean;
  niveauId: string;
  niveauNom: string;
  niveauAnnee: number;
  departementId: string;
  departementNom: string;
  totalEtudiants: number;
  totalEnseignants: number;
  students?: UserSummary[];
  teachers?: UserSummary[];
}

export interface CreateClasse {
  nom: string;
  description?: string;
  capacite: number;
  niveauId: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  niveauId: string;
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  courseName: string;
  niveauId: string;
  teacherId: string;
  teacherName: string;
}

export interface CreateCourseAssignment {
  courseId: string;
  niveauId: string;
  teacherId: string;
}

export interface CreateCourse {
  name: string;
  description?: string;
  niveauId: string;
}
