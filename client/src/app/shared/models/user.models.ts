import { UserRole } from './academic.models';

export interface CreateUserDto {
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  departementId?: number;
}

export interface UpdateUserDto {
  nom?: string;
  prenom?: string;
  email?: string;
  role?: UserRole;
  departementId?: number;
}

export interface UserStats {
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
}
