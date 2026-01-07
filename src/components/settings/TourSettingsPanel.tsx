import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAllTourPreferences } from '@/hooks/useTourPreferences';
import { 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const AVAILABLE_TOURS = [
  { 
    key: 'dashboard', 
    name: 'Tour do Dashboard', 
    description: 'Guia inicial do painel principal' 
  },
  { 
    key: 'cotacao', 
    name: 'Tour de Cotações', 
    description: 'Como gerenciar cotações de fornecedores' 
  },
  { 
    key: 'fornecedor', 
    name: 'Tour de Fornecedores', 
    description: 'Cadastro e gestão de fornecedores' 
  },
];

export const TourSettingsPanel = () => {
  const { preferences, isLoading, resetTour, resetAllTours, refetch } = useAllTourPreferences();

  const getTourStatus = (tourKey: string) => {
    const pref = preferences.find(p => p.tourKey === tourKey);
    if (!pref) return 'pending';
    if (pref.completed) return 'completed';
    if (pref.skipped) return 'skipped';
    return 'pending';
  };

  const handleResetTour = async (tourKey: string) => {
    await resetTour(tourKey);
    toast.success('Tour resetado! Será exibido novamente na próxima visita.');
    refetch();
  };

  const handleResetAllTours = async () => {
    await resetAllTours();
    toast.success('Todos os tours foram resetados!');
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Tours Interativos</CardTitle>
            <CardDescription>
              Gerencie os tours de onboarding do sistema
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reset All Button */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetAllTours}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Resetar Todos
          </Button>
        </div>

        {/* Tour List */}
        <div className="space-y-3">
          {AVAILABLE_TOURS.map(tour => {
            const status = getTourStatus(tour.key);
            const pref = preferences.find(p => p.tourKey === tour.key);
            
            return (
              <div 
                key={tour.key}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    status === 'completed' ? 'bg-success/10' :
                    status === 'skipped' ? 'bg-muted' :
                    'bg-primary/10'
                  }`}>
                    <Sparkles className={`h-4 w-4 ${
                      status === 'completed' ? 'text-success' :
                      status === 'skipped' ? 'text-muted-foreground' :
                      'text-primary'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tour.name}</span>
                      {status === 'completed' && (
                        <Badge variant="outline" className="gap-1 text-success border-success/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Concluído
                        </Badge>
                      )}
                      {status === 'skipped' && (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <XCircle className="h-3 w-3" />
                          Pulado
                        </Badge>
                      )}
                      {status === 'pending' && (
                        <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{tour.description}</p>
                    {pref?.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Concluído em: {new Date(pref.completedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {pref?.skippedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pulado em: {new Date(pref.skippedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetTour(tour.key)}
                  className="gap-2"
                  disabled={status === 'pending'}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reiniciar
                </Button>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-info/10 border border-info/20">
          <p className="text-sm text-info">
            <strong>Dica:</strong> Reiniciar um tour fará com que ele seja exibido automaticamente 
            na próxima vez que você visitar a página correspondente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
