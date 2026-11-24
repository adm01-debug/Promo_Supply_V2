import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// O modulo importa a arvore da sidebar, que instancia o cliente Supabase no
// topo (src/integrations/supabase/client.ts) e exige env no CI local.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn() }, functions: { invoke: vi.fn() } },
}));

import { isItemActive } from '../components/AppSidebar';

// Etapa QA 063 (AUT-10): o item Dashboard apontava para "/", que o router troca
// por "/compras" antes do primeiro render, entao nunca recebia aria-current.

describe('AppSidebar / isItemActive (AUT-10)', () => {
  it('marca o Dashboard em /compras', () => {
    expect(isItemActive('/compras', '/compras')).toBe(true);
  });

  it('marca o Dashboard tambem na raiz, antes do redirect', () => {
    expect(isItemActive('/', '/compras')).toBe(true);
  });

  it('sobrevive ao href antigo "/" (regressao do item de menu)', () => {
    expect(isItemActive('/compras', '/')).toBe(true);
  });

  it('o item Dashboard aponta para /compras, nao para a rota de redirect', () => {
    const fonte = readFileSync(resolve(process.cwd(), 'src/features/layout/components/AppSidebar.tsx'), 'utf8');
    expect(fonte).toContain('{ title: "Dashboard", icon: LayoutDashboard, href: "/compras" }');
    expect(fonte).not.toContain('{ title: "Dashboard", icon: LayoutDashboard, href: "/" }');
  });

  it('nao marca o Dashboard em outra tela', () => {
    expect(isItemActive('/fornecedores', '/compras')).toBe(false);
  });

  it('nao marca o Dashboard numa subtela de compras', () => {
    expect(isItemActive('/compras/nova', '/compras')).toBe(false);
  });

  it('mantem a correspondencia exata dos outros itens', () => {
    expect(isItemActive('/fornecedores', '/fornecedores')).toBe(true);
    expect(isItemActive('/fornecedores/123', '/fornecedores')).toBe(true);
    expect(isItemActive('/fornecedores-x', '/fornecedores')).toBe(false);
  });
});
