-- ============================================
-- MIGRATION: views sem SECURITY DEFINER e sem leitura anônima
-- Data: 2026-11-12
--
-- Causa: supplier_compliance_summary e v_system_health_overview rodavam com os
-- privilégios do dono (lint ERROR "security_definer_view"), ignorando o RLS de
-- fornecedores/contracts/contract_penalties/receiving_checklists/
-- supplier_bonifications/system_alerts; e anon tinha SELECT nelas e em
-- mv_dashboard_kpis (sem RLS possível) — dados de todos os tenants sem login.
--
-- Efeito: as views passam a respeitar o RLS de quem consulta (o dashboard de
-- compliance e o HealthDashboard já exigem login e papel); anon perde SELECT.
-- A edge health-dashboard usa service_role e não muda.
-- ============================================

ALTER VIEW public.supplier_compliance_summary SET (security_invoker = on);
ALTER VIEW public.v_system_health_overview SET (security_invoker = on);

REVOKE SELECT ON public.supplier_compliance_summary FROM anon;
REVOKE SELECT ON public.v_system_health_overview FROM anon;
REVOKE SELECT ON public.mv_dashboard_kpis FROM anon;
