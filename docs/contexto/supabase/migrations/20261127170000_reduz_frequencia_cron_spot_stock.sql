-- Reduz o cron de estoque da SPOT de 20 para 30 minutos (parte 3 da etapa 178).
--
-- Com a contabilidade corrigida em supabase/functions/spot-api/index.ts a cota
-- passou a contar requisicao HTTP (retry e reautenticacao consomem cota), nao
-- mais a chamada logica. O teto do endpoint `Stocks` e 96/dia com reserva de 2
-- (`SPOT_DAILY_LIMITS` e `SPOT_QUOTA_RESERVE` em _shared/spot_api.ts) = 94 req
-- utilizaveis.
--
-- `*/20` = 72 rodadas/dia: cabe, mas deixa so 22 requisicoes de folga (~30%).
-- Uma sequencia de falhas de rede com retry esgota essa folga e as ultimas
-- rodadas do dia passam a ser recusadas com quota_blocked - foi o que aconteceu
-- com o `*/15` anterior (migration 20261121232500).
--
-- `*/30` = 48 rodadas/dia contra 94 utilizaveis: 46 de folga, o suficiente para
-- uma rodada inteira de 4 tentativas ainda caber 11 vezes.
-- Custo aceito: o estoque passa a ter no maximo 30 min de defasagem (antes 20).
--
-- Idempotente: remove se existir e recria com a mesma acao.
DO $do$
DECLARE
  v_present boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spot-api-sync-stock') INTO v_present;
  IF v_present THEN
    PERFORM cron.unschedule('spot-api-sync-stock');
  END IF;
  PERFORM cron.schedule(
    'spot-api-sync-stock',
    '*/30 * * * *',
    'SELECT public._invoke_spot_sync(''syncStock'');'
  );
END;
$do$
