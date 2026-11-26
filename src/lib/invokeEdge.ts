/**
 * Mensagens de erro das edge functions (achado EDG-02).
 *
 * Em resposta não-2xx o `@supabase/functions-js` descarta o corpo JSON: o
 * `invoke` devolve `data: null` e um erro com a mensagem fixa
 * "Edge Function returned a non-2xx status code". A frase de negócio que a
 * edge escreveu em português continua no corpo, acessível em `error.context`
 * (um `Response`, que só pode ser lido uma vez).
 */

export const MENSAGEM_EDGE_PADRAO = 'Não foi possível concluir a operação.';

interface ErroComContexto {
  name?: string;
  message?: string;
  context?: { json?: () => Promise<unknown> } | null;
}

export async function mensagemDeErroDaEdge(
  error: unknown,
  fallback: string = MENSAGEM_EDGE_PADRAO,
): Promise<string> {
  const err = error as ErroComContexto | null | undefined;

  if (err?.name === 'FunctionsHttpError' && typeof err.context?.json === 'function') {
    try {
      const body = (await err.context.json()) as { error?: unknown; message?: unknown } | null;
      const doCorpo =
        typeof body?.error === 'string' ? body.error
        : typeof body?.message === 'string' ? body.message
        : '';
      if (doCorpo.trim()) return doCorpo;
    } catch {
      // corpo não-JSON: cai no error.message
    }
  }

  const mensagem = typeof err?.message === 'string' ? err.message.trim() : '';
  return mensagem || fallback;
}