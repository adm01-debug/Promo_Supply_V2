import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Loader2, RefreshCw, FileText, AlertTriangle } from 'lucide-react';
import type { SpotFinancialDoc } from '@/hooks/useSpotIntegration';
import { openExternalSpotUrl } from './spotHelpers';

interface SpotFinancialTabProps {
  financialDocs: { documents: SpotFinancialDoc[]; hasOverdue: boolean } | null;
  loading: boolean;
  onRefresh: () => void;
}

export function SpotFinancialTab({ financialDocs, loading, onRefresh }: SpotFinancialTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Documentos Financeiros SPOT
            </CardTitle>
            <CardDescription>
              Faturas, notas fiscais e status de pagamento
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {financialDocs?.hasOverdue && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Atenção: Existem faturas vencidas que ainda não foram liquidadas.</span>
            </div>
          )}

          {loading && !financialDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : financialDocs && financialDocs.documents.length > 0 ? (
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Doc</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialDocs.documents.map((doc, i) => (
                  <TableRow key={i} className={doc.isOverdue ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-mono font-medium">{doc.docNumber}</TableCell>
                    <TableCell>{doc.orderNumber}</TableCell>
                    <TableCell className="text-sm">{doc.date}</TableCell>
                    <TableCell className="text-sm">{doc.dueDate}</TableCell>
                    <TableCell className="text-right font-medium">{doc.amount}</TableCell>
                    <TableCell>
                      <Badge variant={doc.isOverdue ? 'destructive' : 'outline'}>
                        {doc.isOverdue ? 'Vencida' : doc.status || 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.downloadUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openExternalSpotUrl(doc.downloadUrl!)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum documento financeiro carregado</p>
              <Button variant="outline" className="mt-3" onClick={onRefresh}>
                Carregar Documentos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
