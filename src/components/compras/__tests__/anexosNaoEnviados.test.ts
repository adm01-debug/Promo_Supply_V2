import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { resumoAnexosNaoEnviados } from '../NovaSolicitacaoModal';

// O helper e puro, mas mora no mesmo modulo do modal, que instancia o client do
// Supabase no import (e exige env). O teste nao usa o client para nada.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({}), storage: { from: () => ({ upload: () => Promise.resolve({ error: null }) }) } },
}));

describe('resumoAnexosNaoEnviados', () => {
  it('um anexo que falhou sai com nome, quantidade e sem plural', () => {
    const aviso = resumoAnexosNaoEnviados(['nota-fiscal.pdf'], 1, false);
    expect(aviso.titulo).toBe('1 de 1 anexo não foi enviado');
    expect(aviso.descricao).toContain('nota-fiscal.pdf');
    expect(aviso.descricao).toContain('não está no servidor');
    expect(aviso.descricao).toContain('O envio para o storage falhou.');
  });

  it('varios anexos somam a quantidade e listam os nomes', () => {
    const aviso = resumoAnexosNaoEnviados(['a.pdf', 'b.png'], 3, false);
    expect(aviso.titulo).toBe('2 de 3 anexos não foram enviados');
    expect(aviso.descricao).toContain('a.pdf, b.png');
    expect(aviso.descricao).toContain('não estão no servidor');
    expect(aviso.descricao).not.toContain('não está no servidor');
  });

  it('sem tenant de upload o motivo e o login, nao o storage', () => {
    const aviso = resumoAnexosNaoEnviados(['a.pdf', 'b.png'], 2, true);
    expect(aviso.descricao).toContain('Organização não identificada para o upload: faça login novamente.');
    expect(aviso.descricao).not.toContain('storage falhou');
  });

  it('sempre confirma que a solicitacao foi criada', () => {
    const aviso = resumoAnexosNaoEnviados(['a.pdf'], 2, false);
    expect(aviso.descricao).toContain('a solicitação foi criada');
    expect(aviso.descricao).not.toContain('não foi criada');
  });
});

describe('NovaSolicitacaoModal nao anuncia anexo que ficou para tras', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/components/compras/NovaSolicitacaoModal.tsx'), 'utf-8');

  it('acumula a falha de cada arquivo depois de logar', () => {
    const log = fonte.indexOf("logger.error('File upload error', { error: uploadError });");
    const acumula = fonte.indexOf('falhasDeAnexo.push(file.name);');
    expect(log).toBeGreaterThan(-1);
    expect(acumula).toBeGreaterThan(log);
    expect(fonte).toContain('falhasDeAnexo.push(...anexosDaSolicitacao.map((file) => file.name));');
  });

  it('avisa na tela quantos anexos nao subiram', () => {
    expect(fonte).toContain('toast.warning(aviso.titulo, { description: aviso.descricao, duration: 12000 });');
    expect(fonte).toContain('resumoAnexosNaoEnviados(falhasDeAnexo, anexosDaSolicitacao.length, semTenantDeUpload)');
    expect(fonte).not.toContain("toast.error('Anexos não enviados: organização não identificada. Faça login novamente.');");
  });
});
