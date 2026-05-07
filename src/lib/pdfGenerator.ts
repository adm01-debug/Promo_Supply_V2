import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateOrderPDF = (data: {
  numero: string;
  data: string;
  fornecedor: any;
  solicitante: any;
  itens: any[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  observacoes?: string;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("ORDEM DE COMPRA", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Número: ${data.numero}`, pageWidth - 60, 18);
  doc.text(`Data: ${data.data}`, pageWidth - 60, 24);

  doc.setLineWidth(0.5);
  doc.line(14, 30, pageWidth - 14, 30);

  // Vendor & Requester Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("FORNECEDOR", 14, 40);
  doc.setFontSize(10);
  doc.text(`Nome: ${data.fornecedor.razao_social}`, 14, 46);
  doc.text(`CNPJ: ${data.fornecedor.cnpj}`, 14, 52);
  doc.text(`Email: ${data.fornecedor.email}`, 14, 58);

  doc.setFontSize(12);
  doc.text("DESTINATÁRIO", 110, 40);
  doc.setFontSize(10);
  doc.text(`Empresa: Promo Supply`, 110, 46);
  doc.text(`Solicitante: ${data.solicitante?.email || 'N/A'}`, 110, 52);

  // Items Table
  autoTable(doc, {
    startY: 70,
    head: [['Item', 'Descrição', 'Qtd', 'Un', 'Unitário', 'Total']],
    body: data.itens.map((i, index) => [
      index + 1,
      i.descricao,
      i.quantidade,
      i.unidade || 'un',
      `R$ ${i.valor_unitario.toFixed(2)}`,
      `R$ ${(i.quantidade * i.valor_unitario).toFixed(2)}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Subtotal: R$ ${data.subtotal.toFixed(2)}`, pageWidth - 60, finalY);
  doc.text(`Frete: R$ ${data.frete.toFixed(2)}`, pageWidth - 60, finalY + 6);
  doc.text(`Desconto: R$ ${data.desconto.toFixed(2)}`, pageWidth - 60, finalY + 12);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: R$ ${data.total.toFixed(2)}`, pageWidth - 60, finalY + 20);

  // Observations
  if (data.observacoes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("OBSERVAÇÕES:", 14, finalY + 35);
    doc.setFontSize(9);
    doc.text(data.observacoes, 14, finalY + 41, { maxWidth: pageWidth - 28 });
  }

  return doc;
};
