# Auditoria forense dos descartes — refs, worktrees e objetos órfãos

Data: 2026-11-18 · Resultado: NENHUM TRABALHO PERDIDO · Método corrigido

## Contexto
Em 18/11/2026 todas as refs locais (~132) e remotas (computador_local, contexto) foram
deletadas após auditoria usando `git cherry -q main <ref>`. Esse script estava ERRADO:
- `git cherry -q` nao existe nesta versao (erro engolido por 2>/dev/null) -> falso 0.
- Mesmo sem o bug, `git cherry` nao serve p/ squash-merge (patch-id individual).

Reversibilidade: backups/promo-supply-refs-20261118/refs-total.bundle (257 refs, fsck limpo)
+ 13 tags arquivo/* + mirror-backup/* + copilot/checkpoints/*.

## Metodo correto (byte level)
1. TREE: 53 refs tem tree identica a um commit da main (checksum 100%).
2. ANCESTRALIDADE: 64 refs nao-ancestrais (esperado, squash-merge).
3. BLOB: para cada uma, todo blob novo (add/mod vs merge-base) precisa estar em
   rev-list --objects main. Unico blob fora = candidato.
4. PATH: blob unico cujo path NAO existe na main = suspeita; path existe = superseded.

## Triagem (64 nao-ancestrais -> 30 com blob unico -> 0 perdidos)
| Tipo | Qtd | Veredito |
|---|---|---|
| deno.lock transiente | 9 | arquivo gerado, fora da main correto |
| workflow diag temp (zz-diag-dburl.yml) | 1 | sessao unica, nunca deveria entrar |
| migration pausa crons SPOT (PR#138) | 1 | obsoleta - crons reativados 571 sucessos |
| migration intermediaria scan_particoes | 1 | virou corrige_alertas_sistema_e_agenda na main |
| _shared/auth.ts (PR#5) | 1 | evoluiu p/ security.ts (33 edges) + xbz_auth.ts |
| componentes compras antigos (fix-all-bugs) | ~20 | todos existem na main em versao posterior |
| scripts/maintenance/* | 8 | presentes na main |

## Confirmacoes finais
- PR#5 auth: squash 6ea00349 NA main "fix(edge): require JWT and validate identity/tenant (#36)".
  Substituido por security.ts + xbz_auth.ts; 33 edges importam _shared/security.ts.
- Dependabot: react-router-dom ^7.18.5 (PR#147), lucide-react ^1.73.0 (PR#149),
  framer-motion ^14.14.0 (PR#148), next-themes ^0.4.6 todos NA MAIN; lucide com fix
  de build 68eedaa7 e icons ExternalLink.
- PriceComparator.tsx (503ln), ContractModal.tsx (518ln), DevolucoesModals.tsx (301ln) NA MAIN.

## Conclusao
Nenhuma ref/worktree/objeto orfao continha trabalho de outro agente que nao esteja na main.
Todos os descartes: squash ja mergeado, arquivo transiente, workflow temporario ou versao
superseded. Nada foi perdido -> limpeza de 18/11/2026 mantida.

## Licao p/ agentes futuros
- NUNCA use `git cherry -q` (flag inexistente) nem engula erro com 2>/dev/null.
- Prove incorporacao pos-squash com: tree em main-trees.txt OU blob-reachability + path.
- Antes de deletar refs: git bundle create ... --all e guardar.