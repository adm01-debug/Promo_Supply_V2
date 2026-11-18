# Views


## public.mv_dashboard_kpis (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.pedidos |
| populada | sim |
| comentário |  |


```sql
SELECT tenant_id,
    date_trunc('day'::text, created_at)::date AS dia,
    count(*) AS total_pedidos,
    COALESCE(sum(valor_total), 0::numeric) AS valor_total,
    COALESCE(avg(valor_total), 0::numeric) AS ticket_medio,
    count(DISTINCT fornecedor_id) AS fornecedores_unicos,
    count(*) FILTER (WHERE status = 'entregue'::text) AS pedidos_entregues,
    count(*) FILTER (WHERE status = 'cancelado'::text) AS pedidos_cancelados
   FROM pedidos p
  WHERE created_at >= (now() - '2 years'::interval)
  GROUP BY tenant_id, (date_trunc('day'::text, created_at)::date);
```

## public.supplier_compliance_summary (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=on |
| depende de | public.contract_penalties, public.contracts, public.fornecedores, public.receiving_checklists, public.supplier_bonifications |
| populada | n/a |
| comentário |  |


```sql
SELECT f.id AS fornecedor_id,
    f.razao_social,
    f.status,
    f.avaliacao,
    COALESCE(cp_agg.penalty_count, 0::bigint) AS penalty_count,
    COALESCE(cp_agg.total_penalty_value, 0::numeric) AS total_penalty_value,
    COALESCE(rc_agg.avg_quality_score, 0::numeric) AS avg_quality_score,
    COALESCE(sb_agg.bonus_count, 0::bigint) AS bonus_count,
    COALESCE(sb_agg.total_bonus_value, 0::numeric) AS total_bonus_value
   FROM fornecedores f
     LEFT JOIN LATERAL ( SELECT count(*) AS penalty_count,
            COALESCE(sum(cp.penalty_value), 0::numeric) AS total_penalty_value
           FROM contract_penalties cp
             JOIN contracts c ON c.id = cp.contract_id
          WHERE c.supplier_id = f.id::text) cp_agg ON true
     LEFT JOIN LATERAL ( SELECT avg(rc.overall_score) AS avg_quality_score
           FROM receiving_checklists rc
          WHERE rc.fornecedor_id = f.id) rc_agg ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS bonus_count,
            COALESCE(sum(sb.value_percent), 0::numeric) AS total_bonus_value
           FROM supplier_bonifications sb
          WHERE sb.fornecedor_id = f.id) sb_agg ON true;
```

## public.v_system_health_overview (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=on |
| depende de | public.system_alerts |
| populada | n/a |
| comentário |  |


```sql
SELECT alert_type,
    severity,
    count(*) AS total_open,
    count(*) FILTER (WHERE created_at > (now() - '24:00:00'::interval)) AS last_24h,
    count(*) FILTER (WHERE created_at > (now() - '01:00:00'::interval)) AS last_1h,
    min(created_at) AS oldest_open,
    max(created_at) AS most_recent
   FROM system_alerts
  WHERE resolved_at IS NULL
  GROUP BY alert_type, severity
  ORDER BY (
        CASE severity
            WHEN 'EMERGENCY'::text THEN 1
            WHEN 'CRITICAL'::text THEN 2
            WHEN 'HIGH'::text THEN 3
            WHEN 'MEDIUM'::text THEN 4
            WHEN 'INFO'::text THEN 5
            ELSE 6
        END), (count(*)) DESC;
```
