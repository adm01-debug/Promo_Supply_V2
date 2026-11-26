import { describe, it, expect } from 'vitest';
import { mensagemDeErroDaEdge, MENSAGEM_EDGE_PADRAO } from '../invokeEdge';

/**
 * O `functions-js` devolve, em resposta nao-2xx, um erro com a mensagem fixa
 * em ingles e o corpo JSON em `error.context`. O auxiliar devolve a frase de
 * negocio que a edge escreveu.
 */
function erroHttp(corpo: unknown, mensagem = 'Edge Function returned a non-2xx status code') {
  return {
    name: 'FunctionsHttpError',
    message: mensagem,
    context: { json: async () => corpo },
  };
}

describe('mensagemDeErroDaEdge', () => {
  it('devolve o campo error do corpo da edge, nao a mensagem fixa em ingles', async () => {
    const erro = erroHttp({ success: false, error: 'Nenhum gestor encontrado no tenant desta solicitacao.' });
    expect(await mensagemDeErroDaEdge(erro)).toBe('Nenhum gestor encontrado no tenant desta solicitacao.');
  });

  it('aceita corpo com a chave message quando nao ha error', async () => {
    expect(await mensagemDeErroDaEdge(erroHttp({ message: 'Cota diaria da SPOT esgotada.' }))).toBe(
      'Cota diaria da SPOT esgotada.',
    );
  });

  it('cai na mensagem do proprio erro quando o corpo nao tem frase util', async () => {
    expect(await mensagemDeErroDaEdge(erroHttp({ success: false }))).toBe(
      'Edge Function returned a non-2xx status code',
    );
  });

  it('nao lanca quando o corpo nao e JSON', async () => {
    const erro = {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: { json: async () => { throw new SyntaxError('Unexpected token < in JSON'); } },
    };
    expect(await mensagemDeErroDaEdge(erro)).toBe('Edge Function returned a non-2xx status code');
  });

  it('nao lanca quando o mesmo context ja foi consumido', async () => {
    const erro = erroHttp({ error: 'Falha controlada.' });
    await mensagemDeErroDaEdge(erro);
    const erroConsumido = {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: { json: async () => { throw new TypeError('Body is unusable'); } },
    };
    expect(await mensagemDeErroDaEdge(erroConsumido)).toBe('Edge Function returned a non-2xx status code');
  });

  it('usa o fallback quando nao ha erro', async () => {
    expect(await mensagemDeErroDaEdge(null)).toBe(MENSAGEM_EDGE_PADRAO);
    expect(await mensagemDeErroDaEdge(undefined, 'Falha ao enviar a notificacao.')).toBe(
      'Falha ao enviar a notificacao.',
    );
  });

  it('devolve a mensagem de erro comum sem tentar ler o corpo', async () => {
    expect(await mensagemDeErroDaEdge(new Error('fetch failed'))).toBe('fetch failed');
  });
});