# ADR 0002: Estratégia de Autenticação e Autorização

**Status:** Aceito
**Data:** 2026-05-16
**Autor:** Especialista Sênior em Engenharia / PhD QA

## Contexto e Problema

O sistema exige um controle de acesso rigoroso para garantir que diferentes usuários (Solicitantes, Compradores, Aprovadores, Administradores) acessem apenas as funcionalidades e dados permitidos. Além disso, como um sistema Multi-Tenant, o isolamento de dados entre organizações é crítico.

## Decisões Tomadas

### 1. Supabase Auth
Utilizamos o Supabase Auth para gerenciar o ciclo de vida do usuário (Signup, Login, MFA, Recuperação de Senha).
*   **Motivo:** Integração nativa com o banco de dados e suporte a provedores OAuth (Google) e Passkeys (WebAuthn).

### 2. Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado.
*   **Filtro por Tenant:** Cada query no banco de dados deve incluir implicitamente ou explicitamente o `tenant_id` do usuário logado.
*   **Filtro por Role:** As políticas de RLS verificam a `role` do usuário (armazenada nos `user_metadata` ou tabela de perfis) para permitir SELECT/INSERT/UPDATE/DELETE.

### 3. Role-Based Access Control (RBAC) no Frontend
*   Utilizamos o hook `useAuth` e o componente `PermissionGate` para esconder/mostrar elementos da UI baseados em permissões.
*   As roles são hierárquicas: Administrador > Gerente > Comprador > Solicitante.

### 4. Auditoria
Todas as tentativas de login (sucesso/falha) e operações críticas (criação de pedidos, aprovações) são registradas em uma tabela de auditoria para compliance.

## Consequências

*   **Positivas:** Segurança robusta, conformidade com GDPR/LGPD, facilidade de implementação de novos níveis de acesso.
*   **Negativas:** Pequeno overhead de latência nas políticas de RLS complexas.

## Alternativas Consideradas

*   **JWT Customizado:** Rejeitado devido à complexidade de manutenção e falta de suporte nativo a RLS do Supabase.
*   **Autorização no Application Level:** Rejeitado por ser propenso a falhas humanas (esquecer um filtro de tenant em uma query).
