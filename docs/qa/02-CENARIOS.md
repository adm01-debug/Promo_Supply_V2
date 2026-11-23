# 02 — Matriz de cenários por jornada

> Gerada cruzando sistematicamente as quatro dimensões pedidas, para cada jornada e cada operação que grava dado:
> **ator** (cada papel · visitante sem login · usuário de outra empresa) × **estado do dado** (vazio · um registro · muitos · no limite · inválido · duplicado · já excluído) × **entrada** (válida · vazia · enorme · malformada · caracteres especiais · valor de borda) × **condição** (duplo clique · duas abas · dois usuários ao mesmo tempo · rede caindo no meio · sessão expirada · terceiro fora do ar · reenvio · passos fora de ordem).
>
> **EXECUTADO** = teste, comando ou consulta rodados nesta sessão, com saída observada. **RASTREADO** = caminho seguido de ponta a ponta no código (interface → hook → chamada → backend → banco → resposta → interface), sem execução.
> Sem acesso SQL vivo ao banco de produção e sem navegador autenticado (ver `01-INVENTARIO.md` §8), **nenhum cenário de escrita pôde ser EXECUTADO**. Os cenários EXECUTADOS são os cobertos por teste automatizado que eu rodei, e as verificações estáticas (`typecheck`, `eslint`, `build`, `deno check`).
> Todo cenário em que **encontrado ≠ esperado** virou achado em `03-ACHADOS.md` (coluna `achado`).
