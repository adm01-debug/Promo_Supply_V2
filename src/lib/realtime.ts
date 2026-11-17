import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * `supabase.channel(topic)` NAO cria sempre um canal novo: o RealtimeClient
 * devolve o canal ja registrado quando o topico coincide. Se esse canal ja
 * passou por `subscribe()`, qualquer `.on("postgres_changes", ...)` posterior
 * lanca "cannot add `postgres_changes` callbacks ... after `subscribe()`" de
 * dentro do efeito do React, derrubando a arvore no ErrorBoundary.
 *
 * Isso acontece sempre que o mesmo hook monta duas vezes: StrictMode, duas
 * instancias do componente na mesma tela, ou remontagem antes do cleanup.
 */

let contador = 0;

/** Unico ponto de criacao de canal do app (OPS-02 audita abertura x cleanup por arquivo). */
function criarCanal(topico: string): RealtimeChannel {
  return supabase.channel(topico);
}

/** Remove do cliente qualquer canal ja registrado sob este topico. */
function descartarTopico(topico: string): void {
  const alvo = `realtime:${topico}`;
  for (const canal of supabase.getChannels()) {
    if (canal.topic === alvo) void supabase.removeChannel(canal);
  }
}

/**
 * Canal exclusivo desta instancia, para assinaturas `postgres_changes`.
 *
 * O topico recebe um sufixo unico porque `postgres_changes` e servidor ->
 * cliente: cada assinante recebe a sua copia e nada depende de varios
 * componentes compartilharem o mesmo topico. Assim duas instancias convivem,
 * cada uma com o seu canal, em vez de uma derrubar a outra.
 */
export function abrirCanalPostgres(base: string): RealtimeChannel {
  contador += 1;
  return criarCanal(`${base}:${contador}`);
}

/**
 * Canal de topico fixo, para `broadcast` e `presence`.
 *
 * Aqui o topico NAO pode mudar: ele e o endereco que une os participantes
 * entre clientes diferentes. Entao descartamos o canal local preexistente
 * antes de recriar, garantindo um canal ainda nao inscrito.
 */
export function abrirCanalCompartilhado(topico: string): RealtimeChannel {
  descartarTopico(topico);
  return criarCanal(topico);
}