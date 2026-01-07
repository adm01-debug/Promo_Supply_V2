import { Loader2 } from 'lucide-react';

export const PageLoader = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
};
