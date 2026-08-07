-- A-14 (Onda 48): índices otimizados para notifications
-- Substitui o partial index simples por um que também ordena por created_at DESC,
-- servindo diretamente a query "não lidas do usuário, mais recentes primeiro".
DROP INDEX IF EXISTS public.idx_notifications_user_unread;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;

-- Índice para dashboards administrativos por tenant (últimas notificações).
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
  ON public.notifications (tenant_id, created_at DESC);

-- Fila de envio pendente (fan-out push/email). Muito seletivo → partial.
CREATE INDEX IF NOT EXISTS idx_notifications_pending_push
  ON public.notifications (created_at)
  WHERE sent_push = false;

CREATE INDEX IF NOT EXISTS idx_notifications_pending_email
  ON public.notifications (created_at)
  WHERE sent_email = false;