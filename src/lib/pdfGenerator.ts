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

  // Branding Colors
  const primaryColor = [13, 148, 136]; // Teal-600 (approx)
  const secondaryColor = [71, 85, 105]; // Slate-600

  // Header Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEM DE COMPRA", 14, 25);
  
  // Order Info
  doc.setFontSize(10);
  doc.text(`Número: ${data.numero}`, pageWidth - 14, 20, { align: 'right' });
  doc.text(`Data: ${data.data}`, pageWidth - 14, 26, { align: 'right' });

  // Vendor & Requester Info
  doc.setFontSize(11);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("DADOS DO FORNECEDOR", 14, 55);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(data.fornecedor.razao_social || 'Fornecedor', 14, 62);
  doc.setFont("helvetica", "normal");
  doc.text(`CNPJ: ${data.fornecedor.cnpj || 'N/A'}`, 14, 67);
  doc.text(`Email: ${data.fornecedor.email || 'N/A'}`, 14, 72);
  doc.text(`Tel: ${data.fornecedor.telefone || 'N/A'}`, 14, 77);

  doc.setFontSize(11);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("DADOS DO DESTINATÁRIO", 110, 55);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("PROMO SUPPLY LTDA", 110, 62);
  doc.setFont("helvetica", "normal");
  doc.text(`Solicitante: ${data.solicitante?.email || 'N/A'}`, 110, 67);
  doc.text("Endereço: Av. Paulista, 1000 - São Paulo, SP", 110, 72);

  // Items Table
  autoTable(doc, {
    startY: 85,
    head: [['#', 'Descrição', 'Qtd', 'Un', 'Preço Unit.', 'Subtotal']],
    body: data.itens.map((i, index) => [
      index + 1,
      i.descricao,
      i.quantidade,
      i.unidade || 'un',
      i.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      (i.quantidade * i.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]),
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor as [number, number, number], 
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 40 },
      5: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: 14, right: 14 }
  });

  // Totals Area
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const totalsX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Subtotal:", totalsX, finalY);
  doc.setTextColor(0);
  doc.text(data.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 14, finalY, { align: 'right' });

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Frete:", totalsX, finalY + 6);
  doc.setTextColor(0);
  doc.text(data.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 14, finalY + 6, { align: 'right' });

  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("Desconto:", totalsX, finalY + 12);
  doc.setTextColor(0);
  doc.text(`- ${data.desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, pageWidth - 14, finalY + 12, { align: 'right' });

  // Divider
  doc.setDrawColor(200);
  doc.line(totalsX, finalY + 16, pageWidth - 14, finalY + 16);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TOTAL DO PEDIDO:", totalsX, finalY + 24);
  doc.text(data.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - 14, finalY + 24, { align: 'right' });

  // Observations
  if (data.observacoes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("OBSERVAÇÕES E TERMOS:", 14, finalY + 45);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text(data.observacoes, 14, finalY + 52, { maxWidth: pageWidth - 28 });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Promo Supply - Sistema de Gestão de Compras v1.0", 14, pageHeight - 10);
  doc.text(`Página 1 de 1`, pageWidth - 14, pageHeight - 10, { align: 'right' });

  return doc;
};
