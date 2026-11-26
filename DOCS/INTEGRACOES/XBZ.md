# API XBZ Brindes — referência técnica (v6.0)

> Cópia sem credenciais. Credenciais reais ficam cifradas em `xbz_credentials` (`XBZ_ENCRYPTION_KEY`) e no documento do Projeto.


**Data:** 21/11/2026 · **Base:** v5.0 (08/03/2026) + engenharia reversa completa do portal MinhaXBZ **novo** (`aplicacao.html`, 31 arquivos JS/HTML, ~830 KB, versões `?v=20261118-portador-api-2`) + 17 endpoints sondados ao vivo em 21/11 com a conta `<usuario-portal>` (PessoaId 17617).
**Regra desta versão:** nada do v5 foi removido — o que mudou está marcado **🔁 MUDOU**, o que é novo **🆕**, o que foi aposentado **⚰️**, o que não foi reproduzido hoje **NÃO VERIFICADO (v5)**.

---

## 0. O que mudou desde o v5 (leia primeiro)

| # | Mudança | Impacto |
|---|---|---|
| 1 | 🔁 `/ruiz/consultaEstoque` exige **`busca` com ≥ 3 caracteres brutos** (`a`→`[]`, `ca`→`[]`, `can`→dados, `" a "`→dados). O hack `busca=a` **morreu** | Qualquer integração que varria o catálogo com `a` passou a receber `[]` com HTTP 200 (n8n F2 desde ≤ 20/11; Promo Supply corrigido na PR #212) |
| 2 | 🆕 `/ruiz/mxbzConsultaEstoque` — endpoint de catálogo **atual do portal**: chaves em **camelCase**, aceita `busca=a` e `busca=""` com filtros de lista, 9 filtros novos (`lista_*_id`) | É o substituto para varredura e para busca facetada |
| 3 | 🔁 `consultaEstoque`/`mxbzConsultaEstoque` devolvem **35 campos** (v5: 27): `CorPredominante{}`, `CorDetalhes{}`, `SiteIntegracao{}` (ficha técnica, vídeo, medidas, `DetalhesJson`), `QtdDisponivel`, `QtdDisponivelExibicao`, `Favorito`, `Containers[]`, `PrevisaoProximoContainer` | Cor e estoque agora vêm no catálogo do portal |
| 4 | 🔁 `/ruiz/consultaPedidos` devolve **80 campos** (v5: 76): `pago` (bool), `statusRetirada`, `expedicaoAgendamentoId`, `detalhes` | `pago` elimina o parse de `loteDebitoStatusCliente` |
| 5 | 🔁 Textos de `statusLogistico` por `idStatus`: `2` = "AGUARDANDO PAGAMENTO PARA INICIAR A SEPARAÇÃO" (v5: "PEDIDO EMITIDO"), `7` = "EM PROCESSO DE SEPARAÇÃO" (v5: "PRONTO E AGUARDANDO PAGAMENTO…") | `idStatus` **não** é 1:1 com o texto — guardar os dois |
| 6 | ⚰️ **Token de retirada (`GetPessoaToken`) é substituído em 23/11/2026** pelo cadastro antecipado do motorista: 🆕 `/expedicaoautorizacao/{Carregar,Autorizar,Revogar}` | Promo Supply precisa do formulário de portador na tela do pedido |
| 7 | 🔁 `/carrinho/CancelarPedido` é **PUT** (v5 dizia GET) | O `xbz-proxy` chama via GET → **provavelmente 405** (NÃO VERIFICADO — é escrita) |
| 8 | 🔁 `/carrinho/CarrinhoItemLancar` tem campo novo no body: `GerarPedido: 0` | Item entra "não selecionado"; `GerarPedidos` só emite itens com `gerarPedido=1` |
| 9 | 🆕 Controllers novos: `/favorito/*`, `/foto/Listar`, `/container/Listar`, `/produtocaixa/Listar`, `/produtotipo/Listar`, `/produtomaterial/Listar`, `/produtotema/Listar`, `/produtotema/AfinidadeDoProduto`, `/ruiz/BrindeNatalinoAtualizarCadastro`, `/carrinho/CarrinhoItemLancarBrindeNatalino` | Taxonomia, fotos, afinidade (IA), reposição por container |
| 10 | 🔁 `produtosCores` → 5 campos (+`UrlCor`); `getToken` → 50 campos (+`MXbzBrindeNatalindoProdutoId`); `GetDashboard` → 14 campos (+`mXbzBrindeNatalindoBannerArquivoNome`); `GetListaDeProdutos` (/clientes) → 30 campos (v5: 28) | — |
| 11 | ✅ Conta `/clientes` **desbloqueada** (v5: bloqueada por 36 req/dia). Token `<token-clientes>` ativo (n8n 21/11 08:00 UTC, 48 s) | — |
| 12 | 🔁 Portal migrou de `app.html` para **`aplicacao.html`** (v0.4 → nova arquitetura `scripts/nucleo/*`, `paginas/*`, PWA desregistrado) | URLs do v5 §2.4 estão obsoletas |

**Total mapeado: 44 endpoints em 11 controllers** (v5: 29 em 3).

---

## 1. Autenticação e sessão — não existem cookies

Investigado em todos os 31 arquivos do portal: **nenhum uso de `document.cookie`**, nenhum header `Authorization`, nenhum `Set-Cookie` relevante. A "sessão" do MinhaXBZ é:

1. **Login** (`paginas/login/login.js:133`): `GET /api/ruiz/getToken?user&passwd&browserFingerPrint=xbz`. Se `Id > 0`, o portal grava **a resposta inteira + `WebLogin` + `WebSenha` em texto claro** em `localStorage.usuarioLogado`.
2. **Revalidação** (`scripts/nucleo/aplicacao.js:70 verificarAutenticacao`): a **cada carregamento** de `aplicacao.html` o portal repete o `getToken`; `Id == 0` → `limparSessaoLocal()` + volta para `index.html`.
3. **Toda requisição** reenvia as credenciais na query string: `user/passwd` (controllers `ruiz`, `container`) ou `_usuario/_senha` (`carrinho`, `favorito`, `foto`, `produtocaixa`, `produtotipo`, `produtomaterial`, `produtotema`, `expedicaoautorizacao`).
4. `WebToken` (`AUTENTICADO_ {AAAAMDHHMMSS}{pessoaId}`) é gerado a cada `getToken` e **nunca é usado** pelo portal em nenhuma chamada; `webToken=xbz` e `browserId=0` em `consultaEstoque` são valores fixos (testado: `webToken=<WebToken real>` dá o mesmo resultado).
5. `TempoDesdeUltimaRequisicao` (99) e `DesbloqueioTemporario` indicam que a XBZ mede intervalo entre requisições por conta — não há expiração de sessão.

**Consequência para integrações:** não há "cookie renovável" a manter. A credencial é a chave permanente; "renovar acesso" = repetir `getToken` e checar `Id > 0`. O que pode acabar com o acesso é (a) senha trocada no portal, (b) `Bloqueado = true` (`BloqueioMotivoDivulgado`, `DataDesbloqueioProgramado`), (c) rate limit no controller `/clientes` (403 "TEMPORARIAMENTE BLOQUEADO POR EXCESSO DE REQUISIÇÕES").

### 1.1 Os três esquemas (todos válidos hoje)

| Esquema | Onde | Formato | Limite | Validado |
|---|---|---|---|---|
| CNPJ + Token | `/api/clientes/*` | header `cnpj`/`token` ou query (só `GetListaDeProdutos`) | **36 req/dia** por CNPJ | ✅ 21/11 (n8n) — 30 campos |
| user + passwd | `/api/ruiz/*`, `/api/container/*` | query `user=&passwd=&browserFingerPrint=xbz` | sem limite observado | ✅ 21/11 |
| _usuario + _senha | `/api/carrinho/*`, `/favorito`, `/foto`, `/produtocaixa`, `/produtotipo`, `/produtomaterial`, `/produtotema`, `/expedicaoautorizacao` | query `_usuario=&_senha=` | sem limite observado | ✅ 21/11 |

Credenciais vigentes: CNPJ `36835552000167` / token `<token-clientes>` (API clientes) · `<usuario-portal>` / `<senha-portal>` (portal). Suporte: Alexandre Ruiz (11 99907-0648, alexandre@ruiztech.net). Vendedora: Amanda (11 2565-1415 / WhatsApp 11 2565-1400 / vendasxbz13@xbzbrindes.com.br).

### 1.2 Erros de login (`getToken` sempre HTTP 200)
`Id: 0` + campos nulos = credencial inválida. O portal também trata 401/403 como "recusado". Validar **sempre** por `Id > 0`.

---

## 2. Infraestrutura

| Item | Valor | Fonte |
|---|---|---|
| API | `https://api.minhaxbz.com.br:5001` (ASP.NET Core / Kestrel atrás de Envoy, JSON UTF-8) | v5 + headers |
| Portal | `https://minhaxbz.com.br/index.html` (login) → `aplicacao.html` (SPA; páginas em `paginas/{dashboard,produtos,carrinho,pedidos,vitrine}/*.html` carregadas por `scripts/nucleo/aplicacao.js`) | 21/11 |
| JS do portal | `scripts/nucleo/{aplicacao,campos-obrigatorios,combobox,controle-numerico,favoritos,filtro-arvore,historico,portador,pwa,sistema-movimento,voltar-ao-topo}.js`, `scripts/tema/{configuracao-tema,tema,natal}.js`, `paginas/login/login.js`, `paginas/*/[pagina].js` | 21/11 |
| CDN imagens | `https://cdn.xbzbrindes.com.br/img/produtos/…`, cores em `https://www.xbzbrindes.com.br/img/cores/*.jpg` | 21/11 |
| Terceiros no portal | Octadesk (chat), viacep.com.br (CEP no cadastro do brinde natalino), youtube-nocookie (vídeos), jsdelivr/cdnjs | 21/11 |
| CORS | `access-control-allow-origin: *` (GET sem preflight) | v5 |
| Porta 5001 | HTTPS não-padrão — proxies corporativos e sandboxes bloqueiam; Supabase Edge e n8n self-hosted alcançam | 21/11 |

### 2.1 Códigos HTTP
| HTTP | Significado | Onde |
|---|---|---|
| 200 | OK (inclusive login inválido!) | todos |
| 204 | Sem conteúdo — `expedicaoautorizacao/Carregar` sem portador; `CarrinhoItemListar` vazio (portal trata 204 e corpo vazio) | 🆕 |
| 401 / 403 | Token `/clientes` inválido / conta bloqueada por rate limit | `/clientes` |
| 404 / 405 / 415 | Endpoint inexistente / método errado / POST sem `Content-Type` | todos |
| 425 | **Conflito de estoque** no carrinho — corpo traz o item ajustado; o portal grava o item do 425 e mostra `modalErro425` | `CarrinhoItemAlterar`, `CarrinhoItemAlterarQuantidade`, `VendedorCarregar`(!) |
| 406–411 | Erros do `PedidoEnviar` (produto, qtd, pagamento, entrega, transportadora obrigatória, estoque) | `/clientes` (v5) |

Datas nulas = `"2000-01-01T00:00:00"`; `ReposicaoDataPrevista` nula = `"0001-01-01T00:00:00"` (/clientes).

---

## 3. Mapa completo de endpoints (44)

### 3.1 `/api/clientes/` — API documentada (8) — auth CNPJ+Token — **36 req/dia**
| Endpoint | Método | Validado | Notas |
|---|---|---|---|
| `GetListaDeProdutos` | GET (query `cnpj`,`token`) | ✅ 21/11 — **30 campos**, 47,9 s | `IdProduto, CodigoXbz, CodigoComposto, CodigoAmigavel, Nome, Descricao, SiteLink, ImageLink, WebTipoId, WebTipo, WebSubTipoId, WebSubTipo, CorWebPrincipalId, CorWebPrincipal, CorWebSecundariaId, CorWebSecundaria, Peso, Altura, Largura, Profundidade, PrecoVenda, PrecoVendaFormatado, PontaDeEstoque, QuantidadeDisponivelEstoquePrincipal, QuantidadeDisponivel, IdStatusConfiabilidade, StatusConfiabilidade, Ncm, ReposicaoDataPrevista, IdPessoa` — **única fonte com quantidade numérica confiável, peso e NCM de todo o catálogo em 1 chamada** |
| `ProdutosListar` | GET (header) `?busca=` | NÃO VERIFICADO (v5); usado pelo n8n Bitrix | devolve `codigoXbz`, `codigoComposto`, `nome` (camelCase) |
| `PedidosListar` | GET (header) | NÃO VERIFICADO (v5) | 32 campos (§7.1 do v5) |
| `EntregaTipoListar` / `PagamentoTipoListar` / `EmpresasGravacaoTransportadoraListar` | GET (header) | NÃO VERIFICADO (v5) | entrega 10/20/30/40 |
| `PedidoEnviar` | POST (header, JSON) | usado em produção pelo n8n Bitrix | body `produtoCodigoXbz, quantidade, pagamentoTipoId, entregaTipoId, ordemDeCompra, detalhes[, entregaTransportadoraGravacaoId]`; resposta 32 campos com `numero` |
| `PedidoCancelar` | PUT (header) | usado pelo n8n Bitrix | — |

### 3.2 `/api/ruiz/` — portal (9) — auth `user`/`passwd`
| Endpoint | Método | Params | Resposta | Validado |
|---|---|---|---|---|
| `getToken` | GET | `user, passwd, browserFingerPrint=xbz` | **50 campos** (§4.1) | ✅ 21/11 |
| `GetDashboard` | GET | `user, passwd` | **14 campos** (§4.4) | ✅ 21/11 |
| `GetPessoaToken` ⚰️ 23/11 | GET | `user, passwd` | `id, pessoasId, token(5 díg.), geracaoData, duracaoMinutos(10), vencimentoData, valido` | v5 (gera token — não sondado) |
| `consultaPedidos` | GET | `user, passwd, browserFingerPrint, idPeriodoSelecionado(1/2/3), idStatusFinanceiroSelecionado(0/1 todos, 2 pagos, 3 pendentes), idStatusLogisticoSelecionado(0), idPessoaEmissao(0), idTipoListagemSelecionada(2), idMostraEntregues(0/1), numeroPedido` | **80 campos/linha, 1 linha por item** (§4.2) | ✅ 21/11 |
| `consultaEstoque` (legado) 🔁 | GET | `user, passwd, browserFingerPrint, webToken=xbz, browserId=0, web_tipo_id, web_sub_tipo_id, cor_id, tema_id, quantidade, filtro_id(0 tudo / 1–3 oculta "sob consulta"), busca(**≥3 chars**), preco_minimo, preco_maximo` | **35 campos PascalCase** (§4.3) | ✅ 21/11 |
| `mxbzConsultaEstoque` 🆕 | GET | `user, passwd, filtro_id, quantidade, busca(pode ser `a` ou vazio se houver outro filtro), preco_minimo, preco_maximo` + listas repetíveis `lista_cores_id`, `lista_departamentos_id`, `lista_categorias_id`, `lista_tipos_id`, `lista_familias_materiais_id`, `lista_materiais_id`, `lista_temas_grupos_id`, `lista_temas_subgrupos_id`, `lista_temas_id` | mesmos 35 campos em **camelCase** | ✅ 21/11 (`busca=a` ok; `busca=` + `lista_cores_id=13` ok; `busca=` sozinho → `[]`; SKU → `[]`) |
| `produtosCores` | GET | nenhum (pública) | `Id, NomeCor, SiglaCor, Descricao, UrlCor` 🔁 | ✅ 21/11 |
| `getSt` | GET | `produto_id, pessoa_id` | 16 campos fiscais (§4.6) | ✅ 21/11 |
| `BrindeNatalinoAtualizarCadastro` 🆕 | POST JSON | `_usuario, _senha` | body `{pessoaId, cep, logradouro, numero, complemento, bairro, cidade, uf, referencia, detalhes, responsavelPeloRecebimento, email, telefone}` | portal (campanha de Natal) |

### 3.3 `/api/carrinho/` — carrinho e pedidos (14) — auth `_usuario`/`_senha`
| Endpoint | Método | Body / params | Resposta | Validado |
|---|---|---|---|---|
| `CarrinhoResumo` | GET | — | 17 campos (`pessoaId, pessoaGrupoId, pessoaRazaoSocial, pessoaCnpjCpf, pessoaGrupoNome, itensNoCarrinhoQtd, itensNoCarrinhoValor, itensSelecionadosQtd, itensSelecionadosValorProdutos, itensSelecionadosValorImpostosTaxas, itensSelecionadosValorTotal, itensSelecionadosValorCheques/Vales/Boletos/Outros, metadata, ipOrigem`) | ✅ 21/11 |
| `CarrinhoItemListar` | GET | — | `[]` ou `{itens|items|dados:[…]}` (portal aceita os 4 formatos); item: §4.5 | ✅ 21/11 (vazio) |
| `CarrinhoItemLancar` | POST JSON | `{ProdutoId:int, Quantidade:int, GerarPedido:0}` 🔁 | item criado (`id > 0`) | portal |
| `CarrinhoItemLancarBrindeNatalino` 🆕 | POST (sem body) | — | item (`id`) | portal |
| `CarrinhoItemAlterar` | **PUT** JSON | item inteiro (§4.5) | item atualizado; **425** = ajustado por estoque | portal |
| `CarrinhoItemAlterarQuantidade` | **PUT** JSON | item com `quantidade` nova | idem (425) | portal |
| `CarrinhoItemRemover` | **DELETE** JSON | `{id:itemId}` | 200 | portal |
| `GerarPedidos` | **PUT** (sem body) | — | `[{pedidoId, pedidoNumero, pedidoPrecoTotal, produtoCodigoSistema, produtoCodigoComposto, produtoNome, quantidade, detalhes, duplicidadeDetectada, duplicidadeDetalhes}]` — sucesso = `pedidoId > 0`; **1 pedido por item selecionado** | portal |
| `CancelarPedido` 🔁 | **PUT** | `_pedido_numero=P…` | texto; sucesso = status 200 | portal (v5 dizia GET) |
| `EntregaTipoListar` | GET | — | `[{id,nome,descricao}]` 30/40/101/102 | ✅ 21/11 |
| `PagamentoTipoListar` | GET | — | `[{id,nome}]` 1/4/5/6 | ✅ 21/11 |
| `PessoasMesmoGrupoListar` | GET | — | `[{id, cnpjCpf, cnpjCpfFormatado, codigoSistema, razaoSocialNome, nomeFantasia, transportadora, gravacao, textoCombo}]` | ✅ 21/11 |
| `VendedorCarregar` | GET | — | `{nomeExibicao, telefone, whatsapp, email, linkFoto}` | ✅ 21/11 |
| `CreditoLimiteConsultar` | GET | — | 12 campos cheque/vale/boleto (não mais usado pelo portal, **continua respondendo**) | ✅ 21/11 |

### 3.4 `/api/expedicaoautorizacao/` 🆕 — portador/motorista (3) — auth `_usuario`/`_senha` — obrigatório a partir de 23/11/2026
| Endpoint | Método | Body | Resposta |
|---|---|---|---|
| `Carregar` | GET | — | 200 `{motoristaNome, motoristaRg, motoristaCpf, veiculoPlaca, detalhes, cadastroData}` ou **204** sem portador (✅ 21/11: 204) |
| `Autorizar` | POST JSON | `{MotoristaNome, MotoristaRg, MotoristaCpf(só dígitos), VeiculoPlaca(normalizada), Detalhes}` | registro gravado; **revoga automaticamente o anterior** (1 portador ativo por cliente) |
| `Revogar` | DELETE | — | texto |
Regras do portal (`portador.js`): CPF validado por dígito verificador, placa Mercosul/antiga normalizada; trocar motorista = `Autorizar` de novo. **Dado pessoal (CPF/RG)** — não persistir fora da XBZ sem cifrar.

### 3.5 `/api/favorito/` 🆕 (3) — auth `_usuario`/`_senha`
`Listar` GET → `[{id(favorito), produtoId, produtoCodigoComposto, produtoCodigoSistema, produtoNome, imageLink, …}]` (✅ 21/11: `[]`) · `Adicionar` POST `?_produtos_id=` · `Remover` DELETE `?_produtos_id=`. Cache local `minhaXBZ.favoritos.v1:<pessoaId>`.

### 3.6 Taxonomia e ficha do produto 🆕 (6) — auth `_usuario`/`_senha` (exceto `container`: `user`/`passwd`)
| Endpoint | Params | Resposta | Validado |
|---|---|---|---|
| `/produtotipo/Listar` | — | árvore `[{id, nome, slug, ordem, categorias:[{id, departamentoId, nome, nomeSingular, slug, ordem, tipos:[{id, categoriaId, nomeCurto, nomeExibicao, nomeSingular, slug, ordem}]}]}]` (dep. 1 "Escrita e Papelaria" → cat. 2 "Canetas" → tipos 2–6) | ✅ |
| `/produtomaterial/Listar` | — | `[{id, nome, ordem, materiais:[{id, familiaId, nome, sustentavel, generico, ordem}]}]` (1 Metal, 2 Plástico…) | ✅ |
| `/produtotema/Listar` | — | `[{id, nome, descricao, ordem, subGrupos:[{id, temaGrupoId, nome, descricao, ordem, temas:[{id, temaSubGrupoId, nome, slug, palavrasChaves, ordem}]}]}]` | ✅ |
| `/produtotema/AfinidadeDoProduto` | `_codigo_amigavel` | `[{produtoCodigoAmigavel, temaGrupo, temaSubGrupo, tema, relevancia 0–10}]` ("fase experimental") | ✅ (09211 → 16+ temas) |
| `/foto/Listar` | `_codigo_amigavel` | `[{tipo:'P'(principal)|'A'(adicional), referencia, imagem, imagemUrl}]` | ✅ (09211 → 6 fotos) |
| `/produtocaixa/Listar` | `_produto_id` | caixa master `[…]` | ✅ (`[]` p/ 23520) |
| `/container/Listar` | `user, passwd, produto_id` | previsões de chegada `[…]` (mapeado para "reposições") | ✅ (`[]` p/ 23520) |

---

## 4. Schemas detalhados (estado em 21/11/2026)

### 4.1 `getToken` — 50 campos
Grupos do v5 (identidade 14, credenciais web 4, 10 flags `Web*`, fiscal 5, bloqueio 7, carimbo/funcionário 6) + 🆕 `MXbzBrindeNatalindoProdutoId` (−3 = sem brinde). Valores atuais: `Id 17617`, `RazaoSocialNome "BRASIL MARCAS INDUSTRIA E COMERCIO DE BRINDES LTDA"`, `IdRegimeFiscalEmissor 2`, `IdRegimeFiscalCliente 1`, `UfEnderecoPrincipal SP`, `EnderecoPrincipalId 52893`, `TipoPessoa J`, `Bloqueado false`, `DataDesbloqueioProgramado 2053-08-22`, todas as 10 flags `Web*` = true exceto `WebIgnoraRestricoes` e `WebCarimboAutomaticoPermitido`. ⚠️ Quando chamado **pelo portal logado**, `WebLogin`/`WebSenha` vêm preenchidos (o portal grava a senha em `localStorage`); via API direta vêm `null`.

### 4.2 `consultaPedidos` — 80 campos por linha (1 linha = 1 item = 1 pedido XBZ)
Ordem real da resposta: `id, dataEmissao, carimboComercial, numero ("P… (OC: …)"), pedidoNumero, numeroPedidoInternoCliente, dataEmissaoString, produtoPrecoUnitario(0), produtoValorImpostosTaxasUnitario(0), produtoValorTotal(0), valorProdutos, valor, valorFormatado, valorIpiTotal, valorIpiTotalFormatado, valorStTotal, valorStTotalFormatado, precoVendaFormatado, indice, razaoSocial, cnpjCpf, pessoaCodigo, idStatus, statusData, compraSolicitacaoId, statusLogistico, loteDebitoStatus1Data, loteDebitoStatus1UsuarioId, loteDebitoStatus1UsuarioLogin, loteDebitoStatus2Data, loteDebitoStatus2UsuarioId, loteDebitoStatus2UsuarioLogin, loteDebitoStatus3Data, loteDebitoStatus3UsuarioId, loteDebitoStatus3UsuarioLogin, dataStatusLoteDebito, idLoteDebitoStatus, loteDebitoStatus, loteDebitoStatusCliente, pagamentoTipoId, pagamentoTipoNome, impedirSeparacaoPedidoSemPagamento, vendedorNome, qtdVolumes, idTipoEntrega, tipoEntrega, idStatusColeta, coletaId, qtdPedidosPendentesNaColeta, responsavelRetirada, idTransportadora, transportadora, gravacaoComoTransportadora, idGravacao, gravacao, entregaTransportadoraGravacaoId, entregaTransportadoraGravacaoNome, canceladoAposConferido, prontoParaRetirada, produtoId, produtoCodigoSistema, produtoCodigoComposto, produtoCodigoAmigavel, produtoNome, produtoSiteLink, pedidoItemQuantidade, pedidoItemId, localExpedicao, localPreExpedicao, coletaInformadaNumero, coletaInformadaData, coletaStatus50Data, carrinhoItemId, nfNumero, detalhes 🆕, respTransportadora, expedicaoAgendamentoId 🆕, statusRetirada 🆕, pago 🆕`.

Amostra real 21/11 (financeiro=3, pendentes ativos): 4 pedidos de 19/11 — `P9313643` (R$ 201,96, `idStatus 2`), `P9306328` (R$ 43,92, `idStatus 7` "EM PROCESSO DE SEPARAÇÃO", `qtdVolumes 1`, vendedor SAC), `P9304792` (R$ 1.178,10), `P9304784` (R$ 6.040,44, 1.428 un.). Todos `pago:false`, `idLoteDebitoStatus 0`, `statusRetirada 1`, `impedirSeparacaoPedidoSemPagamento true`.

**Status financeiro** (`idLoteDebitoStatus`): 0 PENDENTE · 2 PAGO recente · 3 PAGO confirmado; `loteDebitoStatusCliente` = `"PENDENTE"` | `"PAGO (dd/mm/aa hh:mm:ss)"`; 🆕 `pago` boolean. Fluxo 3 etapas (`loteDebitoStatus{1,2,3}Data/UsuarioId`).
**Status logístico** (`idStatus` → textos vistos): 0 "PEDIDO CANCELADO" / "PEDIDO/WEB CANCELADO" · 2 "PEDIDO EMITIDO" **ou** "AGUARDANDO PAGAMENTO PARA INICIAR A SEPARAÇÃO" · 7 "PRONTO E AGUARDANDO PAGAMENTO PARA LIBERAR RETIRADA" **ou** "EM PROCESSO DE SEPARAÇÃO" · 9 "RETIRADO/ENVIADO/FINALIZADO (DATA: …)". Outros textos conhecidos (mapa Bitrix): "AGUARDANDO APROVAÇÃO DO SETOR DE VENDAS", "PRONTO E DISPONÍVEL PARA RETIRADA", "PRONTO E DISPONÍVEL PARA RETIRADA NO SHOWROOM". O portal só usa `idStatus !== 0` (pode cancelar) — **persistir `idStatus` + `statusLogistico` + `statusData`**.
**Entrega nos pedidos**: `idTipoEntrega` 10 "BALCÃO/RETIRADA" (99,6%), 60 "SHOWROOM/RETIRADA".

### 4.3 `consultaEstoque` / `mxbzConsultaEstoque` — 35 campos
`IdPessoa, PessoaWebHabilitaAcesso, PessoaWebExibePrecos, PessoaWebExibeQuantidades, PessoaWebCarrinhoInserir, PessoaWebIgnoraRestricoes, IdProduto, CodigoXbz, CodigoComposto ("09211-AZU/PRE"), CodigoAmigavel, Nome, CorPredominante{Id, NomeCor, SiglaCor, Descricao, UrlCor} 🆕, CorDetalhes{…} 🆕, SiteIntegracao{Nome, Descricao, VideoUrl, VideoThumbnail, Peso, Largura, Altura, Profundidade, Diametro, Espessura, Comprimento, Circunferencia, GravacaoMedida, TamanhoTotal, ModoDeUso, DetalhesJson} 🆕, IdPEssoaFornecedorPadrao, RecebimentoEstoquePadraoId, PrecoVendaFormatado, PrecoVenda, VendaMinima, IgnoraAcrescimoVendaAbaixoDoMinimo, AcrescimoPercentualVendaAbaixoDoMinimo, CarimboAutomaticoPermitido, CarimboAutomaticoPercentualMaximoValor, Multiplos, QtdDesejadaAjustada, SiteLink, ImageLink, Disponivel ("SIM"|"CONSULTE"|"INDISPONÍVEL"), QtdDisponivel 🆕, QtdDisponivelExibicao 🆕 ("8.044" — string pt-BR), IdNcm, IpiTaxa, Favorito 🆕, Containers[] 🆕, PrevisaoProximoContainer 🆕`.
⚠️ Observado `QtdDisponivel: 0` com `QtdDisponivelExibicao: "8.044"` no mesmo item — tratar `QtdDisponivelExibicao` (parse pt-BR) como fonte quando `QtdDisponivel` = 0. Em `mxbzConsultaEstoque` tudo vem em camelCase (`idProduto`, `codigoXbz`, `corPredominante.nomeCor`…); o portal converte com `chavesEmPascalCase`.
Busca: nome e `CodigoAmigavel` funcionam; `CodigoXbz` (SKU `X…`) **não**; `CodigoComposto` NÃO VERIFICADO.

### 4.4 `GetDashboard` — 14 campos
`pessoasId, mensagem (aviso institucional — hoje o comunicado do portador), qtdAguardandoAprovacao, qtdEmitidos, qtdAguardandoPagamento, qtdProducao, qtdProntoParaRetirada, mXbzBrindeNatalindoProdutoId, mXbzBrindeNatalindoProdutoCodigoSistema, mXbzBrindeNatalindoProdutoCodigoComposto, mXbzBrindeNatalindoProdutoQuantidade, mXbzBrindeNatalindoStatusId, mXbzBrindeNatalindoStatusNome, mXbzBrindeNatalindoBannerArquivoNome` 🆕. Valores 21/11: 0 / 4 / 4 / 2 / 1; brinde "NÃO SOLICITADO" (statusId 1; 4 = "BRINDE ENVIADO").

### 4.5 Item do carrinho (`CarrinhoItemListar` / corpo de `CarrinhoItemAlterar`) — reconstruído do `carrinho.js`
`id, produtoId, produtoNome, produtoCodigoSistema, produtoCodigoComposto, produtoImageLink, quantidade, vendaMinima, vendaEmMultiplos, ignoraAcrescimoVendaAbaixoDoMinimo, acrescimoPercentualVendaAbaixoDoMinimo, preco, precoComTaxas, precoTotalComTaxas, ipiValorCalculado, stValorCalculado, entregaTipoId (30/40/101/102), pagtoTipoSelecionadoId (1/4/5/6), pedidoPessoaId (empresa emissora — `PessoasMesmoGrupoListar.id`), clienteOC (ordem de compra), pedidoDetalhes (observações), gerarPedido (0/1 — "selecionado para envio"), sobEncomendaAviso, sobEncomendaCiente, duplicidadeDetectada, duplicidadeDetalhes`.
Regras: item só é emitido por `GerarPedidos` se `quantidade>0 && entregaTipoId>0 && pagtoTipoSelecionadoId>0 && pedidoPessoaId>0 && gerarPedido=1` e, se `sobEncomendaAviso`, com `sobEncomendaCiente=true`. O portal grava alterações em lotes de `PUT CarrinhoItemAlterar` com o item **completo** (não patch). Schema exato NÃO VERIFICADO ao vivo (carrinho vazio em 21/11) — confirmar com 1 `CarrinhoItemLancar` + `CarrinhoItemListar` + `CarrinhoItemRemover`.

### 4.6 `getSt` — 16 campos (✅ 21/11, produto 23520)
`ProdutoSku, ProdutoCodigoComposto, ProdutoNome, PrecoVenda, PrecoVendaFormatado, PrecoBaseCalculo, PrecoBaseCalculoFormatado, ValorStCalculado, ValorStFormatado, PercentualIpi, ValorIpiCalculado, ValorIpiFormatado, Ncm (96081000), NotasDeCalculo (memorial: UF, IPI %, regimes, alíquotas 18/4, MVA original/ajustado/reduzido 70 %, "ST LANÇADO"), ValorMvaConsiderado`. Depende do `pessoa_id` (regime do cliente).

### 4.7 Tabelas fixas
Entrega carrinho 30 TRANSPORTADORA · 40 GRAVAÇÃO · 101 PRÓPRIO · 102 APP/MOTOBOY. Entrega `/clientes` 10 BALCÃO · 20 SHOWROOM · 30 · 40. Pagamento 1 DINHEIRO · 4 PIX/TRANSF/DEP · 5 CRÉDITO · 6 DÉBITO. Cores (23): 1 AZUL, 2 AMARELO, 3 VERMELHO, 4 VERDE, 5 BRANCO, 6 ROSA, 7 ROXO, 8 COLORIDO, 9 PRETO, 10 DOURADO, 11 LARANJA, 12 PRATA, 13 CHUMBO, 14 MARROM, 15 COBRE, 16 MADEIRA, 17 KRAFT, 18 BEGE, 19 INOX, 21 BAMBU, 32 BRONZE, 33 TRANSPARENTE, 34 CINZA, 36 CREME 🆕 (IDs não sequenciais; `UrlCor` `…/img/cores/<nome>-pai.jpg`).

---

## 5. Camadas do portal (o que cada arquivo faz — para saber onde procurar quando a XBZ mudar de novo)

| Arquivo | Função | Endpoints |
|---|---|---|
| `paginas/login/login.js` | login, lembrar usuário (`minhaXBZ.*`), contador PWA | `getToken` |
| `scripts/nucleo/aplicacao.js` (61 KB) | shell da SPA: revalidação, roteamento de páginas, resumo do carrinho (auto-refresh quando a aba está visível), token de retirada (popover 10 min), limpeza de sessão preservando preferências, broadcast `xbz:cart-sync` | `getToken`, `CarrinhoResumo`, `GetPessoaToken` |
| `scripts/nucleo/portador.js` 🆕 | módulo `XBZPortador` (consultar/autorizar/revogar, validação CPF/placa) | `expedicaoautorizacao/*` |
| `scripts/nucleo/favoritos.js` 🆕 | `XBZFavorites` com cache local + sync remoto | `favorito/*` |
| `scripts/nucleo/filtro-arvore.js` 🆕 | componente de árvore (departamento>categoria>tipo etc.) que gera os params `lista_*_id` | — |
| `scripts/nucleo/{combobox,campos-obrigatorios,controle-numerico,historico,sistema-movimento,voltar-ao-topo,pwa}.js` | UI; `pwa.js` **desregistra** service workers antigos | — |
| `paginas/dashboard/dashboard.js` | contadores, banner/cadastro do brinde de Natal (CEP via viacep) | `GetDashboard`, `CarrinhoItemLancarBrindeNatalino`, `BrindeNatalinoAtualizarCadastro` |
| `paginas/produtos/produtos.js` (169 KB) | busca facetada, detalhe (fotos, afinidade, caixa, containers, fiscal), variantes de cor por família, relacionados, adicionar ao carrinho | `mxbzConsultaEstoque`, `consultaEstoque` (relacionados/variantes, `busca=<família>`), `produtosCores`, `getSt`, `foto`, `produtotema`, `produtocaixa`, `container`, `produtotipo`, `produtomaterial`, `CarrinhoItemLancar`, `CarrinhoItemListar` |
| `paginas/carrinho/carrinho.js` (179 KB) | itens, filtros (empresa/entrega/pagamento/OC/envio), gravação em lote, 425, presente de Natal, geração e modal de resultado | `CarrinhoItemListar/Alterar/AlterarQuantidade/Remover`, `GerarPedidos`, `EntregaTipoListar`, `PagamentoTipoListar`, `PessoasMesmoGrupoListar`, `VendedorCarregar`, `GetDashboard` |
| `paginas/pedidos/pedidos.js` (85 KB) | lista/filtros/cancelamento, "comprar de novo" | `consultaPedidos`, `CancelarPedido` (PUT), `CarrinhoItemLancar`, `PessoasMesmoGrupoListar` |
| `paginas/vitrine/vitrine.js` | vitrine configurável (`window.MINHAXBZ_VITRINE_*`), ainda usa `consultaEstoque` com `compatibilitySearch:'a'` — **quebrada pela regra dos 3 chars** | `consultaEstoque`, `getSt` |
| `scripts/tema/*.js` | tema/decoração de Natal | — |

---

## 6. Endpoints que NÃO existem (brute-force v5, 60+ nomes) — inalterado
`ProdutoDetalhe, ProdutoImagens, ProdutoBuscar, ProdutoEstoque, CategoriasListar, PedidoDetalhe, PedidoStatus, PedidoRastreio, PedidoNotaFiscal, FreteCotacao, StatusPedidoListar, CoresListar, SimularPedido, BoletoListar, NotaFiscalListar, TokenValidar, Health, Ping, WebhookCadastrar, …` → 404. **Não há webhook** — toda integração é polling.

---

## 7. Impacto no Promo Supply V2 (código em `adm01-debug/Promo_Supply_V2`)

| Arquivo | Ajuste pela v6 | Prioridade |
|---|---|---|
| `supabase/functions/_shared/xbz_client.ts` | ✅ `XBZ_BUSCA_MIN` (PR #212); 🆕 adicionar `xbzMxbzConsultaEstoque` (camelCase→PascalCase), `xbzPortador{Carregar,Autorizar,Revogar}`, `xbzFavoritos`, `xbzFotos`, `xbzAfinidade`, `xbzTaxonomia(produtotipo|produtomaterial|produtotema)`; **`CancelarPedido` → PUT** | 🔴 |
| `_shared/xbz_catalog_cache.ts` | mapear `IdProduto, CodigoXbz, PrecoVenda, ImageLink, CorPredominante.*, QtdDisponivel/QtdDisponivelExibicao, IpiTaxa, SiteIntegracao.Peso` (+ camelCase) | 🔴 |
| `xbz-sync-pedidos/index.ts` | mapear `valor, pedidoItemQuantidade, nfNumero, tipoEntrega, razaoSocial, numeroPedidoInternoCliente, produtoCodigoSistema`; usar `pago`; guardar `statusRetirada`, `prontoParaRetirada`, `expedicaoAgendamentoId` | 🔴 |
| `xbz-proxy/index.ts` | ações novas: `portadorCarregar/Autorizar/Revogar`, `catalogoFacetado` (mxbz + listas), `fotos`, `afinidade`, `taxonomia`; `cancelarPedido` via PUT; `pessoaToken` marcado como legado | 🟠 |
| `src/pages/catalogo-xbz/*`, `useXbzIntegration.ts` | tipos reais; aba Pedidos com `pago`; formulário de portador | 🟠 |
| DDL (regra 8) | `xbz_produtos`: `ipi_taxa, peso_g, cor_detalhe_id/nome, qtd_disponivel_exibicao, ncm`; `xbz_pedidos`: `pago bool, status_retirada int, expedicao_agendamento_id int, status_data`; tabelas novas opcionais `xbz_taxonomia`, `xbz_portador_log` (sem CPF em claro) | 🟠 |
| n8n (a desligar) | `XBZ - GESTÃO DE PRODUTOS` F2 (`busca=a`) e `vitrine.js` da XBZ quebrados pela mesma regra | ℹ️ |

---

## 8. Orçamento de requisições recomendado
| Processo | Endpoint | Freq. | /dia |
|---|---|---|---|
| Pedidos + pagamento | `consultaPedidos` (período 1, financeiro 0, entregues 1) | 30 min | 48 |
| Catálogo base (estoque, peso, NCM) | `/clientes/GetListaDeProdutos` | 1×/dia | 1 de 36 |
| Catálogo comercial (preço, mínimo, múltiplo, IPI, cor, ficha) | `mxbzConsultaEstoque` por `lista_cores_id` (24 chamadas) ou `busca=a` (1 chamada grande) | 1×/dia | 24 |
| Taxonomia / cores / fotos | `produtotipo`, `produtomaterial`, `produtotema`, `produtosCores`, `foto/Listar` por família | semanal / sob demanda | ~5 |
| Fiscal | `getSt` | por item cotado | ~10 |
| Carrinho / pedido / portador | `/carrinho/*`, `/expedicaoautorizacao/*` | por operação | ~10 |
| Health | `GetDashboard` | 1 h | 24 |

---

## 9. Não verificado nesta versão
- Escritas: `CarrinhoItemLancar/Alterar/Remover`, `GerarPedidos`, `CancelarPedido` (PUT), `favorito/Adicionar|Remover`, `expedicaoautorizacao/Autorizar|Revogar`, `BrindeNatalino*` — mapeadas pelo código do portal, não executadas.
- `GetPessoaToken` (gera token; some em 23/11), `/clientes/{ProdutosListar,PedidosListar,EntregaTipoListar,PagamentoTipoListar,EmpresasGravacaoTransportadoraListar,PedidoEnviar,PedidoCancelar}` (limite diário; dados do v5 e do n8n).
- Schema real de `CarrinhoItemListar` com itens; `container/Listar` e `produtocaixa/Listar` com dados (ambos `[]` para 23520).
- Tamanho/tempo de `mxbzConsultaEstoque?busca=a` completo (só o início foi lido).
- Se `CodigoComposto` funciona como termo de busca.

---

**Versão 6.0 | 21/11/2026 | 44 endpoints em 11 controllers | 17 sondados ao vivo | 31 arquivos do portal analisados | sem cookies — credencial na query em toda chamada**
