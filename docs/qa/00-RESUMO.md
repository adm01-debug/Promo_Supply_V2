# 00 — Resumo para o dono

**Auditoria de QA somente-leitura · 22–23 de novembro de 2026 · código em `d9c58bc`**
Nada foi alterado no sistema. Os detalhes estão em `01-INVENTARIO.md` (o que existe), `02-CENARIOS.md` (o que testei), `03-ACHADOS.md` (o que achei, com a prova) e `04-PLANO.md` (as 300 etapas de correção, na ordem).

---

## Estado geral, em três frases

O sistema está **bem construído por fora e com três buracos de autorização por dentro**: as telas de administração são protegidas só pelo navegador, e quem souber falar direto com o banco pode virar administrador e desligar as travas de aprovação de compras. As verificações automáticas do projeto estão **verdes de verdade** (tipos, lint, 2.311 testes e build passam — eu rodei), mas elas provam rótulo e cálculo isolado, e **nenhuma das 15 jornadas do negócio tem o caminho de gravação testado** — é por isso que defeitos como "a ordem de compra sai com um preço que ninguém cotou" convivem com CI verde. E o ciclo de compra **ainda não fecha de ponta a ponta**: a ordem nasce com valor errado, o pagamento não pode ser pago pela tela, o fornecedor novo desaparece da lista e o módulo de concorrência nunca gravou nada.

O trabalho dos últimos três meses aparece: a grande maioria dos itens do seu caderno de pendências está realmente resolvida no código — conferi um por um. Os achados abaixo são **novos**.

---

## Os 10 maiores riscos, em linguagem de negócio

| # | Risco | Por que importa | Onde está |
|---|---|---|---|
| 1 | **Senha de uma conta administradora de testes está escrita no código, e o repositório é público.** | Qualquer pessoa que leia o repositório entra como administrador. Apagar do código não resolve: o histórico guarda o valor. **A senha precisa ser trocada no Supabase — isso é decisão e ação sua.** | TST-04, HIG-01 · etapa 001 |
| 2 | **Qualquer pessoa com login pode se tornar administradora e apagar as regras de aprovação.** | 30 tabelas — entre elas a configuração de login único e as regras de separação de funções — aceitam gravação de qualquer usuário da empresa, sem conferir cargo. A trava que impede a mesma pessoa pedir e aprovar pode ser desligada por quem não devia. | RLS-01, AUT-01 · etapas 004–006 |
| 3 | **A tela de criar conta é pública e dá cargo de comprador automaticamente.** | Se o cadastro aberto estiver ligado no Supabase, qualquer pessoa cria a própria conta e entra na sua empresa como comprador. Não consegui confirmar se está ligado (o painel não está acessível por aqui) — **vale checar hoje**. | AUT-02 · etapas 002–003 |
| 4 | **A ordem de compra é enviada ao fornecedor com um preço que ninguém cotou.** | O valor vem da estimativa da solicitação e, quando não há estimativa, o sistema arbitra R$ 12 por unidade e soma R$ 150 de frete que ninguém digitou — e grava o item da ordem com valor diferente do total. A ordem é o que vale contra o fornecedor e é a base do pagamento. | UI-02, NEG-03 · onda 2 |
| 5 | **Escolher a cotação vencedora já aprova a solicitação e pula a alçada inteira.** | A compra segue sem passar por quem deveria aprovar. Some-se a isso que a matriz de alçada **não pode ser configurada**: ela escolhe aprovadores de uma lista fictícia que o banco rejeita. | NEG-01, VAL-03 · onda 2 |
| 6 | **Nenhum pagamento pode ser pago pela tela.** | Não existe ação de aprovar pagamento, e o banco não aceita ir de "pendente" direto para "pago". O financeiro não tem caminho para fechar o ciclo. | UI-01 · onda 2 |
| 7 | **Fornecedor cadastrado pela tela desaparece.** | A tela mostra sucesso, mas o fornecedor nasce sem empresa e nunca aparece na lista — não pode ser cotado nem usado numa ordem. Os fornecedores atuais vieram da carga inicial, por isso ninguém viu ainda. | VAL-12 · onda 2 |
| 8 | **Passar o mouse sobre "Solicitações" no menu esvazia a lista de solicitações e a tela de cotação.** | Na navegação normal, o comprador clica e vê "nenhuma solicitação" por 30 segundos, mesmo havendo solicitações. | HK-01 · onda 2 |
| 9 | **Um arraste no quadro de acompanhamento libera o pagamento integral ao fornecedor sem conferir a mercadoria.** | Marcar o cartão como "Entregue" cria sozinho uma conta a pagar pelo valor cheio, com vencimento em 30 dias, sem nenhuma conferência de recebimento — e a rota não exige cargo nenhum. | VAL-10 · onda 2 |
| 10 | **Vários indicadores e relatórios mostram número que não existe, e o alerta crítico pode não chegar a ninguém.** | Tela de Aprovações com indicadores fixos no código, "Exportar dados" de Pedidos que baixa planilha vazia com mensagem de sucesso, conversa com fornecedor encenada no dossiê do pedido; e o despachante de alertas marca o alerta como entregue mesmo quando nenhum canal entregou, sem reenviar nem reportar. | UI-04, UI-07, UI-08, EDG-05, EDG-06 · ondas 2 e 5 |

---

## Contagem

| severidade | quantos | o que significa |
|---|---|---|
| **Crítica** | **14** (em 12 causas distintas) | perda ou vazamento de dado, falha de segurança, ou fluxo principal quebrado |
| **Alta** | **87** | função importante falha ou dá resultado errado |
| **Média** | **79** | funciona com defeito ou fragilidade |
| **Baixa** | **13** | acabamento e higiene |
| **Total** | **193** achados | agrupados em **25 causas raiz** |

Confiança: **181 confirmados**, **12 hipóteses** (cada uma diz o que faltou para confirmar — quase sempre acesso ao banco ou ao navegador autenticado).
Como foram apurados: **39 achados EXECUTADOS** (rodei comando, teste ou consulta e vi o resultado) e **154 RASTREADOS** (segui o caminho pelo código, de ponta a ponta).
Cenários simulados: **423**, cobrindo **15 jornadas** — **64 EXECUTADOS** e **359 RASTREADOS**.
Plano: **300 etapas**, em 8 ondas (68 de segurança, 52 de fluxo quebrado, 34 de integridade, 31 de funcionalidade incompleta, 25 de robustez, 12 de desempenho, 40 de experiência, 38 de higiene). **91 delas pedem sua aprovação antes do merge** (mexem em banco de produção, CI, segredo ou infraestrutura). 7 achados de severidade Baixa ficaram em backlog, listados no fim do plano.

---

## O que NÃO foi coberto, e por quê

Isto é tão importante quanto o que foi achado:

1. **Não houve nenhuma consulta ao banco de produção.** A API do Supabase recusou o acesso (HTTP 403) e nenhuma das conexões disponíveis nesta sessão aponta para o projeto oficial. **Tudo o que afirmo sobre o banco vem do retrato automático que o seu próprio sistema gera de hora em hora** (branch `contexto`, coleta de 22/11). Consequência prática: não pude contar linhas de verdade, nem medir plano de consulta, nem testar as regras de acesso com um usuário real.
2. **"Tabela vazia" é estimativa, não contagem.** O número de linhas do retrato é uma aproximação do Postgres; em mais de cem tabelas ela nunca foi recalculada. Achei um caso que prova isso: uma tabela marcada como vazia tem obrigatoriamente linhas, porque outra tabela aponta para ela. **Qualquer frase do tipo "N tabelas estão vazias" — inclusive a do `ESTADO_ATUAL.md` — precisa de contagem real.**
3. **Nada foi verificado no navegador.** Não há ambiente de teste separado: a suíte de regras de acesso e o teste de ponta a ponta falam com **produção** e fazem login real, então não os rodei de propósito. Por isso os achados de acessibilidade, de uso em celular e de visual são **leitura de código**, não medição em tela.
4. **A Vercel não foi inspecionada.** Li o arquivo de configuração do repositório, mas não vi as variáveis nem os cabeçalhos que produção realmente serve.
5. **Registros de produção (banco, funções, Vercel) não foram lidos** — sem acesso.
6. **A verificação de tipos das funções de borda** foi feita com a versão de Deno que instalei aqui; a plataforma pode usar outra.

Se quiser fechar esses pontos, o que resolve é: uma conexão de **leitura** ao projeto Supabase oficial e um ambiente de preview com um usuário de teste. Com isso, uma segunda rodada confirma as 12 hipóteses e mede o que hoje é só rastreio.

---

## Como usar o plano

As etapas estão na ordem em que devem ser feitas, com dependências declaradas. A onda 1 (68 etapas) é segurança; a onda 2 (51) é o ciclo de compra voltar a funcionar. Cada etapa é uma mudança pequena, com uma PR só, e diz exatamente como conferir que funcionou. As etapas marcadas com aprovação humana **param e te chamam** em vez de serem mergeadas.

Se for para começar por algo hoje, comece pelos três primeiros itens da tabela de riscos: eles não dependem de nenhuma outra etapa e dois deles dependem de uma decisão sua, não de código.
