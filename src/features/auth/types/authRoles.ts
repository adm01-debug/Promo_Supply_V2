export type AppRole = 'admin' | 'coordinator' | 'buyer' | 'finance' | 'viewer';

// Role labels in Portuguese
export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  buyer: 'Comprador',
  finance: 'Financeiro',
  viewer: 'Visualizador',
};

// Role colors
export const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  coordinator: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  buyer: 'bg-primary/10 text-primary border-primary/20',
  finance: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};
