-- Reversao da etapa 247 (UI-12). Remove a coluna criada por
-- 20261127120000_pagamentos_data_agendamento.sql.
-- NAO e aplicada automaticamente: fica fora de supabase/migrations/ de proposito.
-- Aplicar somente se a 247 precisar ser desfeita.

ALTER TABLE public.pagamentos
  DROP COLUMN IF EXISTS data_agendamento;