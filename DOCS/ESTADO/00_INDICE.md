# Auditoria de Estado — Índice dos documentos de evidência

Auditoria executada em **2026-08-16** sobre o repositório `promo-supply-v2`, branch `claude/system-status-roadmap-ei4jyi`.

**Leia primeiro:** [`../ESTADO_ATUAL.md`](../ESTADO_ATUAL.md) — documento executivo, 10 minutos.

Os arquivos abaixo são os **lotes de evidência**. Cada linha de cada tabela cita `arquivo:linha`, nome de objeto de banco ou `jobid` de cron. Consulte-os quando precisar da prova de um achado específico.

---

## Lotes por dimensão

| Doc | Escopo | Volume auditado |
|---|---|---|
| [`L01_ROTAS_E_PAGINAS_NUCLEO.md`](L01_ROTAS_E_PAGINAS_NUCLEO.md) | Boot, roteamento, auth, dashboards, admin, telemetria, segurança, compliance, configurações | 34 arquivos |
| [`L02_PAGINAS_FLUXO_COMPRAS.md`](L02_PAGINAS_FLUXO_COMPRAS.md) | Solicitação → cotação → aprovação → pedido → acompanhamento → recebimento → devolução | 39 arquivos |
| [`L03_PAGINAS_CATALOGO_IA_RELATORIOS.md`](L03_PAGINAS_CATALOGO_IA_RELATORIOS.md) | Catálogos XBZ/SPOT, sourcing, fornecedores, licitações, IA, relatórios, contratos, pagamentos | 50 arquivos |
| [`L04_COMPONENTS_COMPRAS_P1.md`](L04_COMPONENTS_COMPRAS_P1.md) | `components/compras/` — 1ª metade (até `ReceivingModal.tsx`) | 48 arquivos / 13.426 linhas |
| [`L05_COMPONENTS_COMPRAS_P2.md`](L05_COMPONENTS_COMPRAS_P2.md) | `components/compras/` — 2ª metade (de `RiskHeatMap.tsx`) | 69 arquivos / 13.708 linhas |
| [`L06_COMPONENTS_TRANSVERSAIS.md`](L06_COMPONENTS_TRANSVERSAIS.md) | Segurança, pagamentos, a11y, PWA, mobile, onboarding, notificações, atoms/molecules | 68 unidades |
| [`L07_HOOKS.md`](L07_HOOKS.md) | 71 hooks + **mapa de 57 objetos de banco** referenciados | 61 arquivos |
| [`L08_FEATURES.md`](L08_FEATURES.md) | `src/features/` — veredito sobre o refactor de arquitetura | 54 arquivos |
| [`L09_LIB_STORES_SERVICES.md`](L09_LIB_STORES_SERVICES.md) | lib, stores Zustand, services, schemas, types, i18n, env, feature flags | 33 módulos |
| [`L10_EDGE_FUNCTIONS.md`](L10_EDGE_FUNCTIONS.md) | 37 edge functions × quem chama cada uma | 69 arquivos / 12.714 linhas |
| [`L11_CI_TESTES_E_DOCS.md`](L11_CI_TESTES_E_DOCS.md) | CI, qualidade dos testes, e **auditoria da documentação existente** | workflows + suíte + 29 docs |
| [`L12_BANCO_E_RUNTIME.md`](L12_BANCO_E_RUNTIME.md) | **VERIFICADO em produção** — 162 tabelas, cron, storage, RLS, drift | banco vivo |
| [`L13_MIGRATIONS.md`](L13_MIGRATIONS.md) | 279 migrations em altitude + reconstrutibilidade do ambiente | 21.209 linhas |
| [`L14_VERIFICACAO_INDEPENDENTE.md`](L14_VERIFICACAO_INDEPENDENTE.md) | **Fase D** — reprodução dos achados graves, correções e recontagem de cobertura | — |
| [`L15_META_AUDITORIA.md`](L15_META_AUDITORIA.md) | **Auditoria adversarial da própria auditoria** — defeitos do número principal, 2 classificações erradas, lacuna de `components/ui` fechada | — |

> **Se você for consultar um ✅ específico, leia o `L15` antes.** Ele documenta que o ✅ de um lote
> só vale até a fronteira do escopo dele, e identifica 10 linhas ✅ cuja camada de dados foi
> classificada 🟨/⬛ por outro lote. O `L01` carrega errata com dois casos concretos.

---

## Como ler as classificações

| Símbolo | Significado | Prova exigida |
|---|---|---|
| ✅ **IMPLEMENTADO_TOTAL** | Fio completo: UI → lógica → persistência, e em uso real | `arquivo:linha` de cada camada + objeto de banco + evidência de uso |
| 🟨 **IMPLEMENTADO_PARCIAL** | Existe e funciona em parte: falta camada, stub, dado fictício, fio quebrado | `arquivo:linha` + exatamente o que falta |
| 🟦 **SUGERIDO_OU_INICIADO** | Só menção, esqueleto sem lógica, componente sem consumidor | `arquivo:linha` + por que não funciona |
| ⬛ **MORTO_OU_ABANDONADO** | Código presente, nenhum caminho de execução chega nele | `arquivo:linha` + prova de ausência de chamador |

**Regra da evidência aplicada:** célula sem `arquivo:linha` verificável faz a funcionalidade **cair** para 🟦 — nunca subir. Inferência plausível não conta como evidência.

**Regra de ouro aplicada:** *pronto = em produção com uso real*. Feature que existe em código, passa em teste e nunca foi executada por um usuário é 🟨, não ✅.

**Runtime:** marcado `VERIFICADO` ou `NAO_VERIFICADO`, sem meio-termo. Apenas o `L12` teve acesso ao banco de produção; os demais lotes trabalharam por análise estática e declaram isso.

---

## Garantias do processo

- **Produção não foi alterada.** Zero DDL, zero DML, zero migration, zero deploy. Somente leitura.
- **Documentos de outras trilhas não foram editados.** `DOCS/CODEBASE_ATLAS/` e as auditorias anteriores estão intactos; divergências viraram linha de relatório, não edição.
- **Correções em voz alta.** Erros cometidos durante a auditoria — inclusive dois meus — estão registrados no `L14`, com o original preservado.
