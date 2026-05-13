## 🔬 Checklist de Auditoria Técnica (Rumo ao 10/10)

### 🧬 Arquitetura & Manutenibilidade
- [ ] O componente/função respeita o limite de **400 linhas**?
- [ ] A lógica de negócio está isolada em **hooks** ou **services**?
- [ ] Foram evitadas dependências circulares?

### 🔐 Segurança & Integridade
- [ ] As tabelas afetadas possuem políticas de **RLS** configuradas?
- [ ] O **organization_id** está sendo filtrado corretamente (Multi-tenant)?
- [ ] Inputs sensíveis estão sendo sanitizados/validados com **Zod**?
- [ ] Não há `console.log` de dados sensíveis ou em código de produção?

### ⚡ Performance & UX
- [ ] As queries do **React Query** possuem `staleTime` e `gcTime` adequados?
- [ ] Foi implementada **paginação server-side** para listas potencialmente grandes?
- [ ] O componente possui estados de **Loading** e **Erro** amigáveis?

### 🧪 Testes & Qualidade
- [ ] Foram adicionados **testes unitários** para a nova lógica?
- [ ] O código passou no **lint** e **typecheck** local?
- [ ] Commits seguem o padrão **Conventional Commits**?

---

## 📝 Descrição das Mudanças
(Descreva aqui o que foi feito e por que)

## 📸 Screenshots / Vídeos
(Se aplicável)
