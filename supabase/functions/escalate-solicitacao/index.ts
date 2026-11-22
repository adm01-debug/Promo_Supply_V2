// Edge Function: escalate-solicitacao
// Fecha o buraco dos botoes "Escalar para Gerencia" e "Alertar Comprador
// Responsavel" do UrgencyDetailsSheet, que ate aqui so exibiam um toast sem
// gravar nada.
//
// Fluxo:
//   1. Valida o JWT (client anon com o token do usuario) e le a solicitacao
//      por RLS: se ele nao enxerga a linha, a acao falha aqui.
//   2. Resolve destinatarios no service role (ver recipients.ts).
//   3. Grava uma notificacao in-app por destinatario.
//   4. Registra o evento em approval_history.
//   5. Devolve o que realmente aconteceu; nunca "sucesso" sem nada gravado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildCorsHeaders } from "../_shared/security.ts";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { insertNotification } from "../_shared/notifications.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import {
  buildMensagem,
  buildTitulo,
  diasDeEspera,
  resolveRecipients,
  type EscalationTarget,
} from "./recipients.ts";

interface Body {
  solicitacao_id?: string;
  target?: EscalationTarget;
  mensagem?: string;
}

function json(body: unknown, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildResponseHeaders(cors),
  });
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, cors, 405);

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const logger = new EdgeLogger("escalate-solicitacao", requestId);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
    return json({ error: "Server misconfigured" }, cors, 500);
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, cors, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, cors, 401);
  const actorId = userData.user.id;

  const rl = await checkRateLimit({
    identifier: actorId,
    endpoint: "escalate-solicitacao",
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, cors);

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body JSON invalido" }, cors, 400);
  }

  const solicitacaoId = payload.solicitacao_id;
  const target: EscalationTarget = payload.target === "comprador" ? "comprador" : "gerencia";
  if (!solicitacaoId) return json({ error: "solicitacao_id obrigatorio" }, cors, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: solRaw, error: solErr } = await userClient
      .from("solicitacoes")
      .select("id, numero, titulo, status, prioridade, solicitante_id, tenant_id, organization_id, created_at")
      .eq("id", solicitacaoId)
      .maybeSingle();

    if (solErr) {
      logger.error("Erro ao ler solicitacao", { error: solErr.message });
      return json({ error: "Falha ao ler solicitacao" }, cors, 500);
    }
    if (!solRaw) {
      return json({ error: "Solicitacao nao encontrada ou sem permissao" }, cors, 404);
    }

    const sol = solRaw as {
      id: string;
      numero: string | null;
      titulo: string;
      status: string;
      prioridade: string | null;
      solicitante_id: string | null;
      tenant_id: string | null;
      organization_id: string | null;
      created_at: string;
    };

    let tenantId = sol.tenant_id;
    if (!tenantId) {
      const { data: perfil } = await admin
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", actorId)
        .maybeSingle();
      tenantId = (perfil as { tenant_id?: string | null } | null)?.tenant_id ?? null;
    }

    const { destinatarios } = await resolveRecipients(admin, {
      target,
      solicitacaoId: sol.id,
      tenantId,
      actorId,
    });

    if (destinatarios.length === 0) {
      logger.warn("Nenhum destinatario resolvido", { target, tenantId, solicitacaoId });
      return json({
        success: false,
        error: target === "comprador"
          ? "Nenhum comprador responsavel encontrado para esta solicitacao."
          : "Nenhum gestor encontrado no tenant desta solicitacao.",
        target,
        destinatarios: 0,
        notificacoes_criadas: 0,
      }, cors, 422);
    }

    const dias = diasDeEspera(sol.created_at);
    const referencia = sol.numero ?? sol.id.slice(0, 8);
    const titulo = buildTitulo(target, referencia);
    const mensagem = buildMensagem(target, sol.titulo, dias, payload.mensagem);

    let criadas = 0;
    let puladas = 0;
    const falhas: string[] = [];

    for (const userId of destinatarios) {
      const resultado = await insertNotification(admin, {
        user_id: userId,
        tenant_id: tenantId,
        type: target === "gerencia" ? "escalation" : "buyer_alert",
        title: titulo,
        message: mensagem,
        priority: target === "gerencia" ? "critical" : "high",
        data: {
          solicitacao_id: sol.id,
          numero: sol.numero,
          prioridade: sol.prioridade,
          status: sol.status,
          escalado_por: actorId,
          origem: "urgency_details_sheet",
        },
        action_url: `/compras/solicitacoes?id=${sol.id}`,
        action_label: "Abrir solicitacao",
        sent_push: false,
      });

      if (resultado.ok) criadas++;
      else if (resultado.skipped) puladas++;
      else falhas.push(userId);
    }

    // Trilha auditavel do workflow; sem tenant nao ha como gravar (NOT NULL).
    let auditoriaRegistrada = false;
    if (tenantId) {
      const { error: histErr } = await admin.from("approval_history").insert({
        solicitacao_id: sol.id,
        acao: target === "gerencia" ? "escalonamento_gerencia" : "alerta_comprador",
        usuario_id: actorId,
        usuario_nome: userData.user.email ?? null,
        detalhes: {
          target,
          destinatarios,
          notificacoes_criadas: criadas,
          dias_em_aberto: dias,
          mensagem,
        },
        tenant_id: tenantId,
      });
      if (histErr) {
        logger.error("Falha ao registrar approval_history", { error: histErr.message });
      } else {
        auditoriaRegistrada = true;
      }
    }

    logger.info("Escalonamento processado", {
      target,
      solicitacaoId: sol.id,
      destinatarios: destinatarios.length,
      criadas,
      puladas,
      falhas: falhas.length,
      auditoriaRegistrada,
    });

    return json({
      success: criadas > 0,
      target,
      solicitacao: { id: sol.id, numero: sol.numero, titulo: sol.titulo },
      destinatarios: destinatarios.length,
      notificacoes_criadas: criadas,
      puladas,
      falhas: falhas.length,
      auditoria_registrada: auditoriaRegistrada,
      dias_em_aberto: dias,
    }, cors);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    logger.error("Erro inesperado no escalonamento", { error: msg });
    return json({ error: msg }, cors, 500);
  }
});