// Regras do alerta de vencimento de contrato.
// Run: deno test --allow-env --allow-read supabase/functions/check-contract-expiry
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  alertMessage,
  alertTitle,
  daysUntil,
  DEFAULT_NOTICE_DAYS,
  priorityFor,
  selectContractAlerts,
  type ContractRow,
} from "./contractExpiry.ts";

const HOJE = new Date("2026-11-22T07:00:00Z");

function contrato(over: Partial<ContractRow> = {}): ContractRow {
  return {
    id: "c1",
    contract_number: "CONT-2026-002",
    title: "Fornecedor A",
    status: "active",
    end_date: "2026-12-31",
    renewal_type: "manual",
    renewal_notice_days: 30,
    tenant_id: "t1",
    ...over,
  };
}

Deno.test("daysUntil: conta dias inteiros em UTC, sem deslocar por fuso", () => {
  assertEquals(daysUntil("2026-12-31", HOJE), 39);
  assertEquals(daysUntil("2026-11-22", HOJE), 0);
  assertEquals(daysUntil("2026-11-21", HOJE), -1);
});

Deno.test("daysUntil: data invalida nao vira alerta", () => {
  assertEquals(Number.isNaN(daysUntil("31/12/2026", HOJE)), true);
});

Deno.test("selectContractAlerts: contrato dentro da janela de 30 dias alerta", () => {
  const alerts = selectContractAlerts([contrato({ end_date: "2026-12-10" })], HOJE);
  assertEquals(alerts.length, 1);
  assertEquals(alerts[0].days_left, 18);
  assertEquals(alerts[0].in_notice_window, true);
  assertEquals(alerts[0].expired, false);
  assertEquals(alerts[0].priority, "medium");
});

Deno.test("selectContractAlerts: contrato fora da janela nao alerta", () => {
  // end_date real de prod CONT-2026-004, 138 dias a frente
  assertEquals(selectContractAlerts([contrato({ end_date: "2027-04-09" })], HOJE).length, 0);
});

Deno.test("selectContractAlerts: usa renewal_notice_days do contrato, nao o default", () => {
  const c = contrato({ end_date: "2026-12-31", renewal_notice_days: 60 });
  assertEquals(selectContractAlerts([c], HOJE).length, 1);
  assertEquals(selectContractAlerts([c], HOJE)[0].in_notice_window, true);
  // 39 dias > 30 (default) mas < 60 (do contrato): alerta so por causa do override
  assertEquals(DEFAULT_NOTICE_DAYS, 30);
});

Deno.test("selectContractAlerts: renewal_notice_days nulo/invalido cai no default", () => {
  const semJanela = contrato({ end_date: "2027-01-30", renewal_notice_days: null });
  assertEquals(selectContractAlerts([semJanela], HOJE).length, 0);
  const zero = contrato({ end_date: "2026-12-20", renewal_notice_days: 0 });
  assertEquals(selectContractAlerts([zero], HOJE).length, 1);
});

Deno.test("selectContractAlerts: contrato vencido continua alertando como critico", () => {
  const alerts = selectContractAlerts([contrato({ end_date: "2026-11-01" })], HOJE);
  assertEquals(alerts.length, 1);
  assertEquals(alerts[0].expired, true);
  assertEquals(alerts[0].priority, "critical");
  assertEquals(alerts[0].days_left, -21);
});

Deno.test("selectContractAlerts: ignora status terminal e pending_approval", () => {
  for (const status of ["pending_approval", "cancelled", "encerrado", "expirado", "draft"]) {
    assertEquals(
      selectContractAlerts([contrato({ status, end_date: "2026-11-01" })], HOJE).length,
      0,
      `status ${status} nao deveria alertar`,
    );
  }
});

Deno.test("selectContractAlerts: aceita status em portugues `ativo`", () => {
  assertEquals(selectContractAlerts([contrato({ status: "ativo", end_date: "2026-12-01" })], HOJE).length, 1);
});

Deno.test("selectContractAlerts: end_date nulo e ignorado", () => {
  assertEquals(selectContractAlerts([contrato({ end_date: null })], HOJE).length, 0);
});

Deno.test("selectContractAlerts: ordena do mais urgente para o menos", () => {
  const alerts = selectContractAlerts([
    contrato({ id: "a", contract_number: "A", end_date: "2026-12-20" }),
    contrato({ id: "b", contract_number: "B", end_date: "2026-11-10" }),
    contrato({ id: "c", contract_number: "C", end_date: "2026-11-25" }),
  ], HOJE);
  assertEquals(alerts.map((a) => a.contract_number), ["B", "C", "A"]);
});

Deno.test("priorityFor: escada 7/15 dias", () => {
  assertEquals(priorityFor(0), "critical");
  assertEquals(priorityFor(7), "critical");
  assertEquals(priorityFor(8), "high");
  assertEquals(priorityFor(15), "high");
  assertEquals(priorityFor(16), "medium");
  assertEquals(priorityFor(30), "medium");
});

Deno.test("alertTitle/alertMessage: contrato real de prod CONT-2026-002", () => {
  const [alert] = selectContractAlerts([contrato({ end_date: "2026-11-30" })], HOJE);
  assertEquals(alertTitle(alert), "Contrato CONT-2026-002 vence em 8 dia(s)");
  assertEquals(
    alertMessage(alert),
    "O contrato CONT-2026-002 (Fornecedor A) vence em 30/11/2026 — 8 dia(s), renovação manual. Decida renovar ou encerrar antes do vencimento.",
  );
});

Deno.test("alertTitle/alertMessage: contrato vencido", () => {
  const [alert] = selectContractAlerts(
    [contrato({ end_date: "2026-11-01", renewal_type: "automatic" })],
    HOJE,
  );
  assertEquals(alertTitle(alert), "Contrato CONT-2026-002 VENCIDO");
  assertEquals(
    alertMessage(alert),
    "O contrato CONT-2026-002 (Fornecedor A) venceu em 01/11/2026 e continua ativo. Regularize ou encerre para não deixar compras sem cobertura contratual.",
  );
});