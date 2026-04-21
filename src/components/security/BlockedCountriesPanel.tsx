import { useState } from 'react';
import { Globe, Plus, Trash2, Loader2, ShieldBan, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { COMMON_COUNTRIES } from '@/hooks/useGeoRestriction';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

interface BlockedCountry {
  id: string;
  country_code: string;
  country_name: string;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
  is_active: boolean;
}

export const BlockedCountriesPanel = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [reason, setReason] = useState('');

  const { data: blockedCountries = [], isLoading } = useQuery({
    queryKey: ['blocked-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_countries')
        .select('*')
        .order('country_name');
      if (error) throw error;
      return data as BlockedCountry[];
    },
    enabled: !!user,
  });

  const addBlocked = useMutation({
    mutationFn: async ({ country_code, country_name, reason }: { country_code: string; country_name: string; reason: string }) => {
      const { error } = await supabase.from('blocked_countries').insert({
        country_code,
        country_name,
        reason: reason || null,
        blocked_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-countries'] });
      toast.success('País bloqueado com sucesso');
      setShowAddDialog(false);
      setSelectedCountry('');
      setReason('');
    },
    onError: (err: unknown) => {
      const dbErr = err as { code?: string };
      if (dbErr.code === '23505') toast.error('País já está bloqueado');
      else toast.error('Erro ao bloquear país');
    },
  });

  const removeBlocked = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_countries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-countries'] });
      toast.success('País desbloqueado');
    },
    onError: () => toast.error('Erro ao desbloquear'),
  });

  const availableCountries = COMMON_COUNTRIES.filter(
    c => !blockedCountries.some(bc => bc.country_code === c.code)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldBan className="w-5 h-5 text-destructive" />
              Países Bloqueados (Blacklist)
            </CardTitle>
            <CardDescription>
              Países impedidos de acessar o sistema
            </CardDescription>
          </div>
          {isAdmin && (
            <Button variant="destructive" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Bloquear País
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {blockedCountries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum país bloqueado</p>
              <p className="text-sm">Todos os países podem acessar o sistema</p>
            </div>
          ) : (
            <Table aria-label="Países bloqueados">
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Bloqueado em</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedCountries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell className="font-medium">{country.country_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{country.country_code}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {country.reason || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(country.blocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={country.is_active ? "destructive" : "secondary"}>
                        {country.is_active ? 'Bloqueado' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlocked.mutate(country.id)}
                          disabled={removeBlocked.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Bloquear País
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>País</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger><SelectValue placeholder="Selecione um país" /></SelectTrigger>
                <SelectContent>
                  {availableCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Tentativas de acesso suspeitas" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!selectedCountry || addBlocked.isPending}
              onClick={() => {
                const country = COMMON_COUNTRIES.find(c => c.code === selectedCountry);
                if (country) addBlocked.mutate({ country_code: country.code, country_name: country.name, reason });
              }}
            >
              {addBlocked.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
