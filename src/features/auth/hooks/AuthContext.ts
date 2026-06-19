import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole } from '../types/authRoles';
import type { UserProfile, Tenant } from '../schemas/auth.schemas';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  organizationId: string | null;
  tenantId: string | null;
  availableTenants: Tenant[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);