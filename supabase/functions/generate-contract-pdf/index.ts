import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const logger = new EdgeLogger('generate-contract-pdf', requestId);

    const { contract_id } = await req.json();
    if (!contract_id) throw new Error("contract_id é obrigatório");

    logger.info("Generating contract HTML", { contractId: contract_id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch contract
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .single();
    if (cErr || !contract) throw new Error("Contrato não encontrado");

    // Fetch items
    const { data: items } = await supabase
      .from("contract_items")
      .select("*")
      .eq("contract_id", contract_id)
      .order("created_at");

    // Fetch penalties
    const { data: penalties } = await supabase
      .from("contract_penalties")
      .select("*")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: false });

    const penaltyClauses: Array<{ type: string; title: string; description: string }> =
      Array.isArray(contract.penalty_clauses) ? contract.penalty_clauses : [];

    // Build HTML
    const itemsHtml = (items || []).map((item: Record<string, unknown>, i: number) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(String(item.item_name))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.unit}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatBRL(Number(item.unit_price))}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${formatBRL(Number(item.total_price))}</td>
      </tr>
    `).join("");

    const penaltyClausesHtml = penaltyClauses.length > 0 ? penaltyClauses.map((c, i) => `
      <div style="margin-bottom:12px;">
        <p style="margin:0;font-weight:bold;">Cláusula ${i + 1}: ${escapeHtml(c.title)}</p>
        <p style="margin:4px 0 0;color:#555;">${escapeHtml(c.description)}</p>
      </div>
    `).join("") : "<p>Nenhuma cláusula adicional.</p>";

    const appliedPenaltiesHtml = (penalties || []).length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Tipo</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Descrição</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Dias Atraso</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">%</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Valor</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${(penalties || []).map((p: Record<string, unknown>) => `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">${p.penalty_type === "delivery_delay" ? "Atraso" : p.penalty_type === "quality_defect" ? "Qualidade" : "Outro"}</td>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;">${escapeHtml(String(p.description))}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;">${p.days_late || "-"}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;">${p.penalty_percent}%</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#dc2626;">${formatBRL(Number(p.penalty_value))}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:center;">${p.status === "applied" ? "✅ Aplicada" : "⏳ Pendente"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : "<p style='color:#666;'>Nenhuma penalidade aplicada até o momento.</p>";

    const totalPenalties = (penalties || []).reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.penalty_value), 0);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Contrato ${escapeHtml(contract.contract_number)}</title></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;">
  <div style="text-align:center;border-bottom:3px solid #1e40af;padding-bottom:20px;margin-bottom:30px;">
    <h1 style="margin:0;color:#1e40af;font-size:28px;">CONTRATO DE ${contract.contract_type === "service" ? "PRESTAÇÃO DE SERVIÇO" : contract.contract_type === "supply" ? "FORNECIMENTO" : "ACORDO-QUADRO"}</h1>
    <p style="margin:8px 0 0;font-size:16px;color:#666;">${escapeHtml(contract.contract_number)}</p>
  </div>

  <h2 style="color:#1e40af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">1. IDENTIFICAÇÃO DAS PARTES</h2>
  <p><strong>CONTRATANTE:</strong> Promo Supply Ltda.</p>
  <p><strong>CONTRATADA:</strong> ${escapeHtml(contract.supplier_name)} (ID: ${contract.supplier_id})</p>

  <h2 style="color:#1e40af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">2. OBJETO DO CONTRATO</h2>
  <p><strong>Título:</strong> ${escapeHtml(contract.title)}</p>
  ${contract.description ? `<p>${escapeHtml(contract.description)}</p>` : ""}

  <h2 style="color:#1e40af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">3. VIGÊNCIA</h2>
  <p><strong>Início:</strong> ${formatDate(contract.start_date)} | <strong>Término:</strong> ${formatDate(contract.end_date)}</p>
  <p><strong>Renovação:</strong> ${contract.renewal_type === "automatic" ? "Automática" : "Manual"} | <strong>Aviso prévio:</strong> ${contract.renewal_notice_days || 30} dias</p>

  <h2 style="color:#1e40af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">4. VALOR E CONDIÇÕES DE PAGAMENTO</h2>
  <p><strong>Valor Total:</strong> ${formatBRL(Number(contract.total_value))}</p>
  <p><strong>Condições:</strong> ${contract.payment_terms || "Conforme negociação"}</p>

  ${(items || []).length > 0 ? `
  <h2 style="color:#1e40af;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">5. ITENS CONTRATADOS</h2>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#1e40af;color:white;">
        <th style="padding:8px;border:1px solid #ddd;">#</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
        <th style="padding:8px;border:1px solid #ddd;">Unid.</th>
        <th style="padding:8px;border:1px solid #ddd;">Qtd</th>
        <th style="padding:8px;border:1px solid #ddd;">Preço Unit.</th>
        <th style="padding:8px;border:1px solid #ddd;">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  ` : ""}

  <h2 style="color:#dc2626;border-bottom:1px solid #fecaca;padding-bottom:8px;">6. CLÁUSULAS DE SLA E PENALIDADES</h2>
  
  <h3 style="color:#b91c1c;">6.1 Prazo de Entrega</h3>
  <p>O prazo máximo de entrega é de <strong>${contract.sla_delivery_days || 30} dias</strong> corridos a partir da data do pedido.</p>
  <p>Em caso de atraso, será aplicada multa de <strong>${contract.penalty_rate_per_day || 0.5}% por dia</strong> de atraso sobre o valor do pedido, limitada a <strong>${contract.penalty_cap_percent || 20}%</strong> do valor total.</p>

  <h3 style="color:#b91c1c;">6.2 Garantia de Qualidade</h3>
  <p>O score mínimo de qualidade aceito é <strong>${contract.min_quality_score || 3.0}/5.0</strong>.</p>
  <p>Itens fora do padrão de qualidade estarão sujeitos a desconto de <strong>${contract.quality_penalty_percent || 10}%</strong> sobre o valor do lote afetado.</p>
  <p><strong>Política de Devolução:</strong> ${escapeHtml(contract.return_policy || "Itens fora do padrão serão devolvidos com nota de devolução e desconto aplicado no próximo pagamento.")}</p>

  <h3 style="color:#b91c1c;">6.3 Score de Confiabilidade</h3>
  <p>O fornecedor deve manter score mínimo de <strong>${contract.min_supplier_score || 3.0}/5.0</strong>.</p>
  <p>${contract.auto_block_below_score !== false ? "Caso o score caia abaixo do mínimo, <strong>novos pedidos serão automaticamente bloqueados</strong> até regularização." : "O bloqueio automático não está ativado para este contrato."}</p>

  <h3 style="color:#b91c1c;">6.4 Cláusulas Adicionais</h3>
  ${penaltyClausesHtml}

  ${(penalties || []).length > 0 ? `
  <h2 style="color:#dc2626;border-bottom:1px solid #fecaca;padding-bottom:8px;">7. PENALIDADES APLICADAS</h2>
  ${appliedPenaltiesHtml}
  <p style="text-align:right;font-size:18px;margin-top:12px;"><strong>Total de Penalidades: <span style="color:#dc2626;">${formatBRL(totalPenalties)}</span></strong></p>
  ` : ""}

  <div style="margin-top:60px;border-top:2px solid #e5e7eb;padding-top:30px;">
    <h2 style="color:#1e40af;">ASSINATURAS</h2>
    <div style="display:flex;justify-content:space-between;margin-top:40px;">
      <div style="text-align:center;width:45%;">
        <div style="border-bottom:1px solid #333;margin-bottom:8px;height:40px;"></div>
        <p style="margin:0;font-weight:bold;">CONTRATANTE</p>
        <p style="margin:0;font-size:12px;color:#666;">Promo Supply Ltda.</p>
      </div>
      <div style="text-align:center;width:45%;">
        <div style="border-bottom:1px solid #333;margin-bottom:8px;height:40px;"></div>
        <p style="margin:0;font-weight:bold;">CONTRATADA</p>
        <p style="margin:0;font-size:12px;color:#666;">${escapeHtml(contract.supplier_name)}</p>
      </div>
    </div>
    <p style="text-align:center;margin-top:30px;font-size:12px;color:#999;">
      Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
    </p>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, contract_number: contract.contract_number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    if (typeof logger !== 'undefined') {
      logger.error("Error generating contract PDF", { error: msg });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
