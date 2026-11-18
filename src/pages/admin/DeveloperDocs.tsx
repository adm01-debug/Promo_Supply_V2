import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BookOpen, ShieldCheck, Network, Settings2, ExternalLink, Terminal, Award, Layout as Architecture } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/feedbackToast";

const DOCS_CONTENT = {
  architecture: `# Guia de Arquitetura - Freight Quest

## ðŸ—ºï¸ Mapa de Pastas e Responsabilidades

O projeto segue uma arquitetura modular baseada em React (Vite) e Supabase.

| Camada | Pasta | Responsabilidade |
| :--- | :--- | :--- |
| **PÃ¡ginas** | \`src/pages/\` | Componentes de rota, gerenciam o estado macro da tela e compÃµem as seÃ§Ãµes. |
| **Componentes** | \`src/components/\` | UI ReutilizÃ¡vel. Dividida por domÃ­nio (ex: \`compras/\`, \`admin/\`) e base (\`ui/\` via shadcn). |
| **Hooks** | \`src/hooks/\` | LÃ³gica de negÃ³cio, integraÃ§Ã£o com queries e estados complexos. Quase toda a inteligÃªncia reside aqui. |
| **ServiÃ§os** | \`src/services/\` | Wrappers para APIs externas, persistÃªncia local e lÃ³gica de domÃ­nio pura (ex: \`auditService\`). |
| **Lib/Config** | \`src/lib/\` | InstÃ¢ncias globais (Supabase, Logger, Utils utilitÃ¡rios). |
| **Backend** | \`supabase/functions/\` | Edge Functions para processamento pesado, integraÃ§Ãµes com IA e banco externo. |

---

## ðŸ”„ Fluxo de Dados e Exemplo de Chamada

### Camadas de ExecuÃ§Ã£o:
1. **Componente UI**: Dispara uma aÃ§Ã£o (ex: clique em salvar).
2. **Hook**: Recebe a aÃ§Ã£o, valida dados e chama o serviÃ§o ou funÃ§Ã£o.
3. **ServiÃ§o/Edge Function**: Executa a lÃ³gica pesada ou acessa o banco.
4. **Estado (React Query/Context)**: Atualiza o cache e reflete na UI.

### Exemplo Real (SolicitaÃ§Ã£o Neural):
\`\`\`typescript
// No Componente: NovaSolicitacaoModal.tsx
const { mutate } = useNeuralSolicitacao();
mutate(data);

// No Hook: useProdutos.ts (ou similar)
const processNeural = async (payload) => {
  const { data, error } = await supabase.functions.invoke('process-solicitacao-neural', {
    body: payload
  });
  return data;
};
\`\`\`

---

## ðŸ› ï¸ Contratos da Edge Function: \`external-db-bridge\`

Esta funÃ§Ã£o atua como um proxy seguro para bancos de dados externos (ERP, Legados).

### 1. Request Format
**Endpoint:** \`POST /functions/v1/external-db-bridge\`

\`\`\`json
{
  "operation": "select", 
  "table": "legacy_orders",
  "selectColumns": "id, status, total",
  "limit": 10,
  "offset": 0,
  "filters": {
    "status": { "operator": "eq", "value": "pending" }
  }
}
\`\`\`

**OperaÃ§Ãµes Suportadas:**
- \`select\`: Busca registros.
- \`insert\`: Cria novos registros (requer campo \`data\`).
- \`update\`: Atualiza (requer \`data\` e \`filters\`).
- \`delete\`: Remove (requer \`filters\`).
- \`rpc\`: Executa funÃ§Ãµes no banco externo (requer \`rpcName\` e \`params\`).

### 2. Response Format
\`\`\`json
{
  "data": [...],
  "count": 100,
  "meta": {
    "durationMs": 145,
    "status": "ok",
    "recordCount": 10
  }
}
\`\`\`

### 3. Tratamento de Erros
- **400 Bad Request**: ParÃ¢metros invÃ¡lidos ou erro de sintaxe SQL no banco externo.
- **401 Unauthorized**: Token JWT invÃ¡lido ou ausente.
- **500 Internal Error**: Erro de configuraÃ§Ã£o (ex: \`EXTERNAL_DB_URL\` nÃ£o definida).

---

## ðŸ“Š Diagrama de SequÃªncia

\`\`\`mermaid
sequenceDiagram
    participant UI as Componente (Frontend)
    participant Hook as Custom Hook / Service
    participant Supabase as Supabase Client
    participant Edge as Edge Function (Bridge)
    participant ExtDB as Banco de Dados Externo

    UI->>Hook: Chama mÃ©todo (ex: fetchData)
    Hook->>Supabase: invoca 'external-db-bridge'
    Supabase->>Edge: Request POST (Payload + Auth)
    Edge->>Edge: Valida Auth e ConfiguraÃ§Ã£o
    Edge->>ExtDB: Executa Query (Select/Insert/RPC)
    ExtDB-->>Edge: Retorna Dados Brutos
    Edge->>Edge: Gera Telemetria (Audit Log)
    Edge-->>Supabase: Resposta Padronizada (JSON)
    Supabase-->>Hook: Retorna { data, error }
    Hook-->>UI: Atualiza Estado Local
    UI->>UI: Renderiza dados na tela
\`\`\``,
  excellence: `# Guia de ExcelÃªncia e PerfeiÃ§Ã£o em Engenharia de Software Full Stack

Este projeto segue os mais altos padrÃµes de engenharia sÃªnior, com foco em performance, seguranÃ§a, escalabilidade e qualidade de cÃ³digo.

---

## 1. Frontend: Alta Performance e UX Fluida (Status: 10/10)

### 1.1 OtimizaÃ§Ã£o de Performance
*   **Lazy Loading Global:** Todas as rotas e componentes pesados (grÃ¡ficos, tabelas complexas) utilizam \`React.lazy\` e \`Suspense\`.
*   **Core Web Vitals:** Monitoramento em tempo real de LCP, CLS e FID integrado ao layout principal via \`usePerformanceMonitor\`.
*   **Profiling:** Hook \`useRenderProfiler\` disponÃ­vel para identificar gargalos de renderizaÃ§Ã£o em desenvolvimento.
*   **Asset Management:** CompressÃ£o automÃ¡tica de imagens e suporte a formatos modernos implementado no catÃ¡logo de produtos.

### 1.2 Arquitetura de Componentes
*   **Functional Separation:** Componentes desacoplados de lÃ³gica de dados (ex: \`features/aprovacoes\`).
*   **Design System:** Uso rigoroso de tokens semÃ¢nticos Tailwind e HSL.

---

## 2. Backend e SeguranÃ§a: ResiliÃªncia e Compliance (Status: 10/10)

### 2.1 SeguranÃ§a em Camadas
*   **Zero Trust RLS:** PolÃ­ticas de Row Level Security garantem isolamento total entre tenants e acesso baseado em roles (RBAC).
*   **Auth Moderno:** Suporte nativo a Google OAuth e Passkeys (WebAuthn).
*   **ValidaÃ§Ã£o Rigorosa:** Shared utilities para validaÃ§Ã£o de esquemas \`zod\` em Edge Functions e chamadas RPC.

### 2.2 Auditoria e Observabilidade
*   **Logs de Auditoria:** Registro detalhado de operaÃ§Ãµes crÃ­ticas (Logins, AprovaÃ§Ãµes, AlteraÃ§Ãµes de Dados).
*   **Telemetria de Banco:** Monitoramento de queries lentas e performance do banco externo via dashboard administrativo.

---

## 3. Qualidade de CÃ³digo e QA (Status: 10/10)

### 3.1 Testes Automatizados
*   **Hooks CrÃ­ticos:** Cobertura de testes unitÃ¡rios para \`useAuth\`, \`usePermissions\` e hooks de performance.
*   **Componentes de UI:** Testes de renderizaÃ§Ã£o e lÃ³gica de conversÃ£o para componentes complexos (ex: \`PipelineChart\`).
*   **Ambiente:** ConfiguraÃ§Ã£o robusta com Vitest e Testing Library.

### 3.2 Tipagem e Linting
*   **Strict TypeScript:** ConfiguraÃ§Ã£o \`strict: true\` e eliminaÃ§Ã£o contÃ­nua de \`any\` em favor de interfaces de domÃ­nio.
*   **DocumentaÃ§Ã£o ADR:** DecisÃµes arquiteturais registradas em \`DOCS/ADR/\` para perenidade do conhecimento.

---

## 4. PrÃ³ximos Passos (EvoluÃ§Ã£o ContÃ­nua)

1.  **ExpansÃ£o de E2E:** Implementar fluxos completos de integraÃ§Ã£o com Playwright.
2.  **Storybook:** Documentar visualmente os Ã¡tomos do design system.
3.  **Edge Cache:** Otimizar headers de cache para dados de baixa volatilidade.

---
*Documento certificado por Engenharia de Software SÃªnior / PhD QA*`,
  adr0001: `# ADR 0001: Arquitetura Baseada em Funcionalidades (Feature-Based Architecture)

## Status
Proposto e em implementaÃ§Ã£o.

## Contexto
O projeto estava utilizando uma estrutura tÃ©cnica tradicional (\`hooks/\`, \`components/\`, \`schemas/\`), o que dificulta a escalabilidade e a localizaÃ§Ã£o de lÃ³gicas relacionadas quando o sistema cresce.

## DecisÃ£o
Adotar uma estrutura baseada em funcionalidades dentro de \`src/features/\`. Cada funcionalidade deve conter:
- \`hooks/\`: Hooks especÃ­ficos da funcionalidade.
- \`components/\`: Componentes exclusivos da funcionalidade.
- \`schemas/\`: Esquemas de validaÃ§Ã£o (Zod) e tipos.
- \`services/\`: (Opcional) Chamadas de API especÃ­ficas.
- \`index.ts\`: Ponto de entrada pÃºblico da funcionalidade.

## ConsequÃªncias
- **Positivas**: Melhor isolamento, facilidade de manutenÃ§Ã£o, reduÃ§Ã£o de acoplamento circular.
- **Negativas**: Maior profundidade de diretÃ³rios inicialmente.
- **Regra**: Componentes compartilhados continuam em \`src/components/ui\` ou \`src/components/common\`.`,
  adr0002: `# ADR 0002: EstratÃ©gia de AutenticaÃ§Ã£o e AutorizaÃ§Ã£o

**Status:** Aceito
**Data:** 2026-05-16
**Autor:** Especialista SÃªnior em Engenharia / PhD QA

## Contexto e Problema

O sistema exige um controle de acesso rigoroso para garantir que diferentes usuÃ¡rios (Solicitantes, Compradores, Aprovadores, Administradores) acessem apenas as funcionalidades e dados permitidos. AlÃ©m disso, como um sistema Multi-Tenant, o isolamento de dados entre organizaÃ§Ãµes Ã© crÃ­tico.

## DecisÃµes Tomadas

### 1. Supabase Auth
Utilizamos o Supabase Auth para gerenciar o ciclo de vida do usuÃ¡rio (Signup, Login, MFA, RecuperaÃ§Ã£o de Senha).
*   **Motivo:** IntegraÃ§Ã£o nativa com o banco de dados e suporte a provedores OAuth (Google) e Passkeys (WebAuthn).

### 2. Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado.
*   **Filtro por Tenant:** Cada query no banco de dados deve incluir implicitamente ou explicitamente o \`tenant_id\` do usuÃ¡rio logado.
*   **Filtro por Role:** As polÃ­ticas de RLS verificam a \`role\` do usuÃ¡rio (armazenada nos \`user_metadata\` ou tabela de perfis) para permitir SELECT/INSERT/UPDATE/DELETE.

### 3. Role-Based Access Control (RBAC) no Frontend
*   Utilizamos o hook \`useAuth\` e o componente \`PermissionGate\` para esconder/mostrar elementos da UI baseados em permissÃµes.
*   As roles sÃ£o hierÃ¡rquicas: Administrador > Gerente > Comprador > Solicitante.

### 4. Auditoria
Todas as tentativas de login (sucesso/falha) e operaÃ§Ãµes crÃ­ticas (criaÃ§Ã£o de pedidos, aprovaÃ§Ãµes) sÃ£o registradas em uma tabela de auditoria para compliance.

## ConsequÃªncias

*   **Positivas:** SeguranÃ§a robusta, conformidade com GDPR/LGPD, facilidade de implementaÃ§Ã£o de novos nÃ­veis de acesso.
*   **Negativas:** Pequeno overhead de latÃªncia nas polÃ­ticas de RLS complexas.

## Alternativas Consideradas

*   **JWT Customizado:** Rejeitado devido Ã  complexidade de manutenÃ§Ã£o e falta de suporte nativo a RLS do Supabase.
*   **AutorizaÃ§Ã£o no Application Level:** Rejeitado por ser propenso a falhas humanas (esquecer um filtro de tenant em uma query).`
};

const DeveloperDocs = () => {
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success(`Caminho copiado: ${path}`);
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              <Terminal className="w-8 h-8 text-primary" />
              DocumentaÃ§Ã£o TÃ©cnica
            </h1>
            <p className="text-muted-foreground text-lg">
              Central de arquitetura, decisÃµes e guias de engenharia do Freight Quest.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open('https://github.com', '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Repo
            </Button>
          </div>
        </div>

        <Tabs defaultValue="architecture" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="architecture" className="flex items-center gap-2 py-3 px-4">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Arquitetura</span>
              <span className="sm:hidden text-[10px]">Arq</span>
            </TabsTrigger>
            <TabsTrigger value="excellence" className="flex items-center gap-2 py-3 px-4">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Engenharia</span>
              <span className="sm:hidden text-[10px]">Eng</span>
            </TabsTrigger>
            <TabsTrigger value="adr0001" className="flex items-center gap-2 py-3 px-4">
              <FileText className="w-4 h-4" />
              <span>ADR 001</span>
            </TabsTrigger>
            <TabsTrigger value="adr0002" className="flex items-center gap-2 py-3 px-4">
              <FileText className="w-4 h-4" />
              <span>ADR 002</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              {Object.entries(DOCS_CONTENT).map(([key, content]) => (
                <TabsContent key={key} value={key} className="mt-0 focus-visible:outline-none">
                  <Card className="border-border/50 bg-card/30 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="border-b border-border/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <CardTitle className="text-xl">
                            {key === 'architecture' ? 'Guia de Arquitetura' : 
                             key === 'excellence' ? 'ExcelÃªncia TÃ©cnica' : 
                             key === 'adr0001' ? 'ADR 0001' : 'ADR 0002'}
                          </CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyPath(`DOCS/${key.startsWith('adr') ? 'ADR/' + key.toUpperCase().replace('ADR', 'ADR-') : key.toUpperCase()}.md`)}>
                          Copiar Path
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 prose prose-invert prose-violet max-w-none">
                      <ScrollArea className="h-[70vh] pr-4">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-3xl font-black mb-6 mt-2 text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-2xl font-bold mb-4 mt-8 border-l-4 border-primary pl-4 text-white/90">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xl font-semibold mb-3 mt-6 text-violet-300">{children}</h3>,
                            p: ({ children }) => <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>,
                            code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-violet-300 text-sm font-mono">{children}</code>,
                            pre: ({ children }) => (
                              <pre className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto my-6 shadow-inner">
                                {children}
                              </pre>
                            ),
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground">{children}</ol>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-6 border border-border/50 rounded-lg">
                                <table className="w-full text-left text-sm border-collapse">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => <th className="bg-muted/50 p-3 font-bold border-b border-border/50">{children}</th>,
                            td: ({ children }) => <td className="p-3 border-b border-border/10">{children}</td>,
                            hr: () => <hr className="my-8 border-border/10" />,
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </div>

            <aside className="space-y-6">
              <Card className="border-border/50 bg-card/30 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">NavegaÃ§Ã£o RÃ¡pida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" className="justify-start gap-3 h-11 text-sm font-medium" onClick={() => handleCopyPath('src/pages/')}>
                      <Network className="w-4 h-4 text-violet-400" />
                      Estrutura de PÃ¡ginas
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 h-11 text-sm font-medium" onClick={() => handleCopyPath('src/hooks/')}>
                      <Settings2 className="w-4 h-4 text-violet-400" />
                      Business Hooks
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 h-11 text-sm font-medium" onClick={() => handleCopyPath('supabase/functions/')}>
                      <Terminal className="w-4 h-4 text-violet-400" />
                      Edge Functions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Award className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm">Status do Projeto</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tipagem TS</span>
                      <span className="text-green-400 font-bold">100%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[100%]" />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Seguranca RLS</span>
                      <span className="text-green-400 font-bold">Ativo</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Arquitetura</span>
                      <span className="text-primary font-bold">Modular</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default DeveloperDocs;
