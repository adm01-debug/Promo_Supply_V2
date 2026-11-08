import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole } from '../types/authRoles';
import type { UserProfile, Tenant, Empresa } from '../schemas/auth.schemas';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  /** ID do grupo empresarial (organization). */
  organizationId: string | null;
  /** Alias semântico de organizationId — o grupo do usuário. */
  grupoId: string | null;
  /** ID da empresa atualmente selecionada (null = "Todas as empresas"). */
  tenantId: string | null;
  selectedEmpresaId: string | null;
  availableTenants: Tenant[];
  /** Alias semântico — todas as empresas do grupo às quais o usuário tem acesso. */
  availableEmpresas: Empresa[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** @deprecated use setSelectedEmpresa */
  switchTenant: (tenantId: string) => Promise<void>;
  /** Troca a empresa em foco (null = visão consolidada de todas). */
  setSelectedEmpresa: (empresaId: string | null) => void;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
