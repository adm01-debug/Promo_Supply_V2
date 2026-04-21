import { useState } from 'react';
import { Globe, Plus, Trash2, Loader2, ShieldCheck, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useGeoRestriction, COMMON_COUNTRIES } from '@/hooks/useGeoRestriction';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

export const GeoWhitelistPanel = () => {
  const { 
    geoSettings, 
    allowedCountries, 
    isLoading, 
    toggleRestriction,
    addCountry,
    removeCountry,
    toggleCountryActive,
    isAdmin
  } = useGeoRestriction();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');

  const availableCountries = COMMON_COUNTRIES.filter(
    c => !allowedCountries?.some(ac => ac.country_code === c.code)
  );

  const handleToggleRestriction = async (enabled: boolean) => {
    try {
      await toggleRestriction.mutateAsync(enabled);
      toast.success(enabled ? 'Restrição geográfica ativada' : 'Restrição geográfica desativada');
    } catch (error) {
      toast.error('Erro ao alterar configuração');
    }
  };

  const handleAddCountry = async () => {
    if (!selectedCountry) {
      toast.error('Selecione um país');
      return;
    }

    const country = COMMON_COUNTRIES.find(c => c.code === selectedCountry);
    if (!country) return;

    try {
      await addCountry.mutateAsync({
        country_code: country.code,
        country_name: country.name,
      });
      toast.success(`${country.name} adicionado à whitelist`);
      setShowAddDialog(false);
      setSelectedCountry('');
    } catch (error: unknown) {
      const dbError = error as { code?: string };
      if (dbError.code === '23505') {
        toast.error('País já está na whitelist');
      } else {
        toast.error('Erro ao adicionar país');
      }
    }
  };

  const handleRemoveCountry = async (id: string, name: string) => {
    try {
      await removeCountry.mutateAsync(id);
      toast.success(`${name} removido da whitelist`);
    } catch (error) {
      toast.error('Erro ao remover país');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleCountryActive.mutateAsync({ id, is_active: !currentActive });
      toast.success(currentActive ? 'País desativado' : 'País ativado');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isRestrictionEnabled = geoSettings?.geo_restriction_enabled ?? false;
  const activeCountriesCount = allowedCountries?.filter(c => c.is_active).length ?? 0;

  return (
    <>
      <div className="space-y-6">
        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Restrição Geográfica Global
            </CardTitle>
            <CardDescription>
              Apenas países na whitelist poderão acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {isRestrictionEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-success" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Restrição por País</p>
                  <p className="text-sm text-muted-foreground">
                    {isRestrictionEnabled 
                      ? `Ativa - ${activeCountriesCount} país(es) permitido(s)` 
                      : 'Desativada - Todos os países podem acessar'}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Switch
                  checked={isRestrictionEnabled}
                  onCheckedChange={handleToggleRestriction}
                  disabled={toggleRestriction.isPending}
                />
              )}
            </div>

            {isRestrictionEnabled && activeCountriesCount === 0 && (
              <Alert variant="destructive">
                <ShieldAlert className="w-4 h-4" />
                <AlertDescription>
                  Atenção: Nenhum país está na whitelist! Adicione pelo menos um país para evitar bloqueio total.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Countries List Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success" />
                Países Permitidos (Whitelist)
              </CardTitle>
              <CardDescription>
                Lista de países que podem acessar o sistema
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar País
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!allowedCountries || allowedCountries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum país na whitelist</p>
                <p className="text-sm">Adicione países para permitir o acesso</p>
              </div>
            ) : (
              <Table aria-label="Tabela de dados">
                <TableHeader>
                  <TableRow>
                    <TableHead>País</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowedCountries.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.country_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{country.country_code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={country.is_active ? "default" : "secondary"}
                          className={country.is_active ? "bg-success" : ""}
                        >
                          {country.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(country.added_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(country.id, country.is_active)}
                                disabled={toggleCountryActive.isPending}
                                title={country.is_active ? 'Desativar' : 'Ativar'}
                              >
                                {country.is_active ? (
                                  <ToggleRight className="w-4 h-4 text-success" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCountry(country.id, country.country_name)}
                                disabled={removeCountry.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Country Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Adicionar País à Whitelist
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione o País</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um país" />
                </SelectTrigger>
                <SelectContent>
                  {availableCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apenas IPs deste país terão acesso quando a restrição estiver ativa
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddCountry}
              disabled={addCountry.isPending || !selectedCountry}
            >
              {addCountry.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
