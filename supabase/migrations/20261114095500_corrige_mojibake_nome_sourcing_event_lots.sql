-- ============================================
-- MIGRATION: corrige mojibake (duplo encoding UTF-8) em sourcing_event_lots.nome
-- Data: 2026-11-14
--
-- Problema: 6 registros foram gravados com os bytes UTF-8 já decodificados e
-- recodificados como se fossem LATIN1, produzindo 'â\x80\x94' (em-dash) e
-- 'Ã¡'/'Ã§' (á/ç) no lugar dos caracteres UTF-8 reais.
--
-- Correção: converte a string (que está em UTF-8 válido) para bytea LATIN1 e
-- redecodifica como UTF-8 — o inverso do dano. Ex.: 
--   'Levantamento â\x80\x94 Canetas MetÃ¡licas' -> 'Levantamento — Canetas Metálicas'
--
-- Idempotente: o WHERE seleciona apenas linhas em que a conversão realmente
-- altera o nome (linhas corretas permanecem com nome == convert(...)).
-- Não destrutiva: só UPDATE em linhas reprováveis.
-- ============================================

UPDATE public.sourcing_event_lots
SET nome = convert_from(convert_to(nome, 'LATIN1'), 'UTF8')
WHERE id IN (
    'cb86e920-8c9c-4bd1-86ec-dd564ad2a3fd',
    'cb15175d-a432-43dc-a614-5a1e6509a6ea',
    '7601ca32-7893-4c40-9178-e566fe7687da',
    '570d5b80-764d-4335-a2d3-84743580dde2',
    '533fbe25-fd47-4119-bf28-131fc79f26c1',
    '4b77703a-ad7e-450f-bec8-998229063f85'
)
AND convert_from(convert_to(nome, 'LATIN1'), 'UTF8') <> nome;
