-- Etapa 247 do plano de QA (achado UI-12): agendar pagamento descartava a data
-- escolhida no calendario.
--
-- POR QUE: PagamentoScheduleModal coleta a data, converte e o toast anuncia
-- "agendado para dd/MM/yyyy", mas Pagamentos.tsx chamava
-- bulkUpdateStatus(ids, 'agendado') sem data e a tabela pagamentos nao tinha
-- coluna onde guarda-la. Reaproveitar data_pagamento nao serve:
-- PagamentoAdvancedKPIs.tsx:80 conta "pagos no mes" por data_pagamento e passaria
-- a somar pagamento agendado como pago.
--
-- O QUE ESTA MIGRATION FAZ: adiciona uma coluna nullable, sem default e sem
-- tocar dado existente. Nenhuma policy, CHECK ou trigger e alterada; os GRANTs
-- de tabela ja existentes (20251220181110, linhas 310/314) cobrem a coluna nova.
--
-- nao-e-bug:
--   - nullable: pagamento pendente/aprovado nunca tem data de agendamento; so o
--     fluxo "AGENDAR N SELECIONADOS" preenche o campo.
--   - sem default: DEFAULT CURRENT_DATE gravaria agendamento que ninguem pediu.
--   - sem indice: nenhuma consulta filtra por data_agendamento hoje.

ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS data_agendamento date;

COMMENT ON COLUMN public.pagamentos.data_agendamento IS
  'Data escolhida pelo financeiro ao agendar o pagamento (status agendado). data_pagamento continua sendo a data efetiva do pagamento.';