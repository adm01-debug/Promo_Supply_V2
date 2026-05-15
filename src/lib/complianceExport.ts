import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * PDF Generator for Compliance Reports.
 */

export const generateCompliancePDF = (data: any[], kpis: any) => {
  const doc = new jsPDF();
  const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');

  // Header
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Relatório de Compliance de Fornecedores', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Gerado em: ${timestamp}`, 14, 30);
  doc.text('Promo Supply - Sistema de Gestão de Compras', 14, 35);

  // KPIs Section
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 40, 196, 40);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Resumo Executivo', 14, 50);

  doc.setFontSize(10);
  doc.text(`Fornecedores Infratores: ${kpis.infractors.length}`, 14, 60);
  doc.text(`Fornecedores em Conformidade: ${kpis.compliant.length}`, 14, 65);
  doc.text(`Taxa Média de Pontualidade: ${kpis.avgOnTimeRate.toFixed(1)}%`, 14, 70);
  doc.text(`Total em Penalidades: ${kpis.totalPenaltyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 75);

  // Table
  autoTable(doc, {
    startY: 85,
    head: [['Fornecedor', 'Status', 'Pontualidade', 'Qualidade', 'Penalidades', 'Valor Multas']],
    body: data.map(item => [
      item.razao_social,
      item.on_time_rate >= 90 ? 'Conforme' : 'Risco',
      `${item.on_time_rate}%`,
      `${Number(item.avg_quality_score).toFixed(1)}/5`,
      item.penalty_count,
      Number(item.total_penalty_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // blue-600
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
    margin: { top: 85 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`relatorio-compliance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
