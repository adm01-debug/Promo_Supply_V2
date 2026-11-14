# 🛡️ Arsenal de Auditoria Técnica — 10/10

Arsenal de prompts que agentes de IA usam para auditar e corrigir sistemas de produção da Promo Brindes.

**Stack-alvo:** React/TypeScript + Supabase (Postgres, RLS, Edge Functions) + Bitrix24 + n8n + Evolution API + Docker Swarm/Portainer + Cloudflare Workers + Lovable.

## Índice

| Prompt | Quando usar |
|--------|-------------|
| [PROMPT_AUDITORIA_SISTEMA_v2.md](./PROMPT_AUDITORIA_SISTEMA_v2.md) | Auditoria completa do sistema: 20 dimensões com nota 0-10, scorecard ponderado e plano de ação |
| [PROMPT_AUDITORIA_MIGRACAO_DB_v1.md](./PROMPT_AUDITORIA_MIGRACAO_DB_v1.md) | Validar migração de banco com evidência dupla ORIGEM+DESTINO e veredito ÍNTEGRA/RESSALVAS/INCOMPLETA |
| [prompt-auditoria-100-etapas-v2.md](./prompt-auditoria-100-etapas-v2.md) | Converter gaps da auditoria em plano de correção — 1 etapa = 1 PR verificável, P0 primeiro |

## Dimensões e pesos (SISTEMA_v2)

- **×3 Crítico:** Segurança · Autenticação · Autorização · Data Integrity
- **×2 Alto:** Banco de Dados · Tipagem · Validação · Testes · Arquitetura
- **×1 Padrão:** CI/CD · Documentação · Infra/DevOps · Logging · Observabilidade · Lógica de Negócio · Manutenibilidade · Operacionalidade · Performance · Qualidade de Código · Operações

## Regras invioláveis

1. **Evidência ou silêncio** — achado sem arquivo:linha, query+resultado ou comando+saída não entra.
2. **Leia antes de afirmar** — nunca descreva código que não abriu; nunca assuma que tabela/rota/config existe.
3. **Não invente** — lib → lockfile; CLI → --help; número → medido ou "não medido".
4. **Causa raiz, não sintoma** — máx 3 tentativas na mesma hipótese.
5. **Diff mínimo** — proibida reescrita de módulo que funciona.
6. **Zero genérico** — todo item nomeia arquivo/tabela/rota específica deste sistema.
7. **Marque o não-verificado** — seção NÃO VERIFICADO com motivo.
8. **Nunca nota 10 sem prova** — 10/10 = nada a melhorar.
9. **Calibre ao contexto** — mas nunca abaixo de segurança/integridade por tamanho.
10. **PII mascarada** em toda evidência.

## Protocolo

- **Auditoria de sistema:** Fase 0 Inventário → Fase 1 20 dimensões (nota + evidência + gaps + ações) → Fase 2 Scorecard + nota ponderada + Top 10 ROI + Roadmap (Quick Wins → Sprint 1 → Sprint 2 → Backlog).
- **Migração de banco:** mesma query nos 2 bancos, `count(*)` real (nunca reltuples). Veredito: ÍNTEGRA (0 P0/P1) · RESSALVAS (0 P0, ≥1 P1) · INCOMPLETA (≥1 P0).
- **Plano de correção:** 1 etapa = 1 PR verificável com checklist binário; P0 primeiro → dependências → menor esforço; migration destrutiva = expand-contract com preview e rollback.

## Como usar

Cole o prompt como instrução para o agente de IA e adicione o contexto do sistema a auditar:

- **Opção A:** `+ "Analise o repositório: https://github.com/user/repo"`
- **Opção B:** `+ <arquivos principais colados>`
- **Opção C:** `+ "Foque apenas nas dimensões: Segurança, Autenticação, Autorização"`
- **Opção D (re-auditoria):** `+ "Re-audite considerando as correções: [PRs/commits]"`

## Entregáveis por tipo de request

| Request | Entregável |
|---------|------------|
| Auditoria de sistema | Scorecard 20 dimensões + Top 10 ações + Roadmap em ondas |
| Migração de banco | PARIDADE_DB.md com veredito final |
| Plano de correção | PLANO_100.md sequenciado (ou PLANO_200_ETAPAS.md, se o volume exigir) |
| Revisar prompt | Arquivo revisado como doc + análise do que mudou |