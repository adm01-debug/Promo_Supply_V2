import { useState } from 'react';
import { LogIn, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const LoginAttemptsPanel = () => {
  const { loginAttempts, isLoading } = useSecurityLogs();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const filteredAttempts = loginAttempts?.filter(attempt => {
    const matchesSearch = search === '' ||
      attempt.email.toLowerCase().includes(search.toLowerCase()) ||
      attempt.ip_address?.includes(search);

    const matchesFilter = filter === 'all' ||
      (filter === 'success' && attempt.success) ||
      (filter === 'failed' && !attempt.success);

    return matchesSearch && matchesFilter;
  });

  const successCount = loginAttempts?.filter(a => a.success).length ?? 0;
  const failedCount = loginAttempts?.filter(a => !a.success).length ?? 0;

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Tentativas de Login
        </CardTitle>
        <CardDescription>
          Histórico de tentativas de autenticação no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{loginAttempts?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{successCount}</p>
            <p className="text-sm text-muted-foreground">Sucesso</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{failedCount}</p>
            <p className="text-sm text-muted-foreground">Falhas</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="success">Sucesso</TabsTrigger>
              <TabsTrigger value="failed">Falhas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table */}
        {!filteredAttempts || filteredAttempts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LogIn className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma tentativa de login encontrada</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Motivo da Falha</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.slice(0, 100).map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      {attempt.success ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <XCircle className="w-3 h-3 mr-1" />
                          Falha
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{attempt.email}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {attempt.ip_address || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {attempt.failure_reason || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredAttempts && filteredAttempts.length > 100 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Mostrando 100 de {filteredAttempts.length} tentativas
          </p>
        )}
      </CardContent>
    </Card>
  );
};
