# Welcome to your Lovable project

## 📑 Promo Supply - Gestão de Compras

Promo Supply é um sistema completo de gestão de compras, fornecedores e contratos empresariais, focado em eficiência, transparência e blindagem operacional.

### 🚀 Tecnologias
- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Auth, DB, Storage, Edge Functions)
- **TanStack Query** (Caching & State)
- **i18next** (Multi-idioma: PT-BR, EN, ES)
- **Framer Motion** (Animações fluidas)

### 🛠️ Estrutura do Projeto
- `src/components`: Componentes modulares e reutilizáveis
- `src/pages`: Páginas da aplicação e dashboards
- `src/hooks`: Lógica de negócio e integração com API em hooks customizados
- `src/lib`: Utilitários, configurações de segurança e helpers globais
- `supabase`: Esquema do banco de dados, migrações e funções de borda
- `DOCS/`: Central de documentação técnica detalhada

### 📘 Documentação Técnica
Para uma compreensão profunda da arquitetura, padrões de código e decisões técnicas, consulte:
- [Guia de Arquitetura](./DOCS/ARCHITECTURE_GUIDE.md) - Mapa de pastas, fluxo de dados e contratos de API.
- [Guia de Excelência de Engenharia](./DOCS/ENGINEERING_EXCELLENCE.md) - Padrões de segurança, performance e UX.
- [Decisões de Arquitetura (ADRs)](./DOCS/ADR/README.md) - Histórico de decisões críticas do projeto.

A documentação também está disponível dentro do sistema no painel administrativo.


### 🔒 Segurança e Compliance
- **RBAC:** Controle de acesso baseado em perfis (Admin, Coordenador, Comprador, Financeiro, Viewer).
- **Audit Log:** Rastreabilidade total de ações críticas via `auditService`.
- **MFA & Passkeys:** Suporte a autenticação multifator e chaves de acesso biométricas.
- **Account Lockout:** Proteção contra ataques de força bruta.
- **CSP & Headers:** Configurações rígidas de segurança no `index.html`.

### ⚡ Desenvolvimento
```sh
# Instalação
bun install

# Execução (Dev)
bun run dev

# Build (Produção)
bun run build

# Testes
bun run test
```

### 🌍 Internacionalização
O sistema detecta automaticamente o idioma do navegador, persistindo a preferência do usuário no `localStorage`.

---
Pronto para produção. Blindagem 10/10. 🚀
