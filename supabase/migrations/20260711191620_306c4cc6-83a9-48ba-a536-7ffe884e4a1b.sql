
-- Guardrails de sessão por role: previne queries travadas e transações abandonadas
-- consumirem conexões da pool. Padrão DBA de produção.

-- authenticated: usuários logados. 30s é suficiente para qualquer query legítima
-- (relatórios pesados devem ir para edge function assíncrona).
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE authenticated SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE authenticated SET lock_timeout = '10s';

-- anon: apenas leitura pública. 10s é generoso.
ALTER ROLE anon SET statement_timeout = '10s';
ALTER ROLE anon SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE anon SET lock_timeout = '5s';

-- service_role: edge functions/admin. 60s permite jobs de manutenção e outbox.
ALTER ROLE service_role SET statement_timeout = '60s';
ALTER ROLE service_role SET idle_in_transaction_session_timeout = '120s';
ALTER ROLE service_role SET lock_timeout = '15s';

-- authenticator: role do PostgREST que faz SET ROLE. Herda os limites acima
-- quando faz SET ROLE, mas fixamos um teto de segurança.
ALTER ROLE authenticator SET statement_timeout = '60s';
ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '120s';

COMMENT ON ROLE authenticated IS 'Usuário logado - timeouts: statement 30s, idle_tx 60s, lock 10s';
COMMENT ON ROLE anon IS 'Público - timeouts: statement 10s, idle_tx 30s, lock 5s';
COMMENT ON ROLE service_role IS 'Admin/edge - timeouts: statement 60s, idle_tx 120s, lock 15s';
