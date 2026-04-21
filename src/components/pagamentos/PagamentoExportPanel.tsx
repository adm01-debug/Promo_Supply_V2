import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, Table2 } from "lucide-react";
import { format } from "date-fns/format";
import { toast } from "@/hooks/use-toast";
import type { Pagamento } from "@/hooks/usePagamentos";

interface Props {
  pagamentos: Pagamento[];
}

export const PagamentoExportPanel = ({ pagamentos }: Props) => {
  const exportCSV = () => {
    const headers = ['Número', 'Fornecedor', 'NF', 'Forma Pagamento', 'Status', 'Vencimento', 'Data Pagamento', 'Valor', 'Valor Pago', 'Saldo'];
    const rows = pagamentos.map(p => [
      p.numero,
      p.fornecedor?.razao_social || '',
      p.numero_nf || '',
      p.forma_pagamento || '',
      p.status,
      p.data_vencimento,
      p.data_pagamento || '',
      p.valor.toFixed(2),
      (p.valor_pago || 0).toFixed(2),
      (p.valor - (p.valor_pago || 0)).toFixed(2),
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: `${pagamentos.length} pagamentos exportados em CSV` });
  };

  const exportJSON = () => {
    const data = pagamentos.map(p => ({
      numero: p.numero,
      fornecedor: p.fornecedor?.razao_social || '',
      nf: p.numero_nf,
      forma_pagamento: p.forma_pagamento,
      status: p.status,
      vencimento: p.data_vencimento,
      data_pagamento: p.data_pagamento,
      valor: p.valor,
      valor_pago: p.valor_pago || 0,
      saldo: p.valor - (p.valor_pago || 0),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagamentos_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: `${pagamentos.length} pagamentos exportados em JSON` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <Table2 className="h-4 w-4 mr-2" />
          Exportar CSV ({pagamentos.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar JSON ({pagamentos.length})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
