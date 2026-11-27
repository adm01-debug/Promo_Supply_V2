/**
 * Tenant do usuario logado para as colunas `tenant_id` geradas como obrigatorias.
 *
 * O banco perdeu o default do tenant zero (`tenant_id` ficou NOT NULL sem default
 * na etapa 143), entao quem insere precisa mandar a coluna. O contexto entrega
 * `tenantId` (`current_tenant_id()`), que em producao so vem quando o JWT traz o
 * claim; o `organizationId` (grupo do usuario) e o fallback ja usado por
 * `useDevolucoes` e `useLicitacoes`. Sem vinculo, falha em vez de gravar linha
 * sem empresa.
 */
export function resolverTenantId(
  tenantId: string | null | undefined,
  organizationId: string | null | undefined,
): string {
  const tenant = tenantId ?? organizationId;
  if (!tenant) throw new Error('Sua sessão não está vinculada a nenhuma empresa');
  return tenant;
}