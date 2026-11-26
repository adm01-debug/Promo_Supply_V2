import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Reproduz o crash de producao:
 *   "cannot add `postgres_changes` callbacks for realtime:critical_alerts_badge
 *    after `subscribe()`"
 *
 * O dublê imita o RealtimeClient real (RealtimeClient.js:338-350): `channel(topic)`
 * devolve o canal ja existente quando o topico coincide, e `on()` lanca se esse
 * canal ja passou por `subscribe()`.
 */

class CanalFalso {
  topic: string;
  inscrito = false;
  constructor(topico: string) {
    this.topic = `realtime:${topico}`;
  }
  on() {
    if (this.inscrito) {
      throw new Error(
        "cannot add `postgres_changes` callbacks for " +
          this.topic +
          " after `subscribe()`"
      );
    }
    return this;
  }
  subscribe() {
    this.inscrito = true;
    return this;
  }
}

const canais: CanalFalso[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (topico: string) => {
      const existente = canais.find((c) => c.topic === `realtime:${topico}`);
      if (existente) return existente;
      const novo = new CanalFalso(topico);
      canais.push(novo);
      return novo;
    },
    getChannels: () => canais,
    removeChannel: (canal: CanalFalso) => {
      const i = canais.indexOf(canal);
      if (i >= 0) canais.splice(i, 1);
    },
    removeAllChannels: () => {
      canais.length = 0;
    },
  },
}));

const modulo = await import("../realtime");
const { supabase } = await import("@/integrations/supabase/client");

// As funcoes devolvem o `RealtimeChannel` real; nos testes quem responde e o dublê.
const abrirCanalPostgres = (base: string) =>
  modulo.abrirCanalPostgres(base) as unknown as CanalFalso;
const abrirCanalCompartilhado = (topico: string) =>
  modulo.abrirCanalCompartilhado(topico) as unknown as CanalFalso;

beforeEach(() => {
  supabase.removeAllChannels();
});

describe("padrao antigo (controle)", () => {
  it("supabase.channel com nome fixo quebra na segunda montagem", () => {
    const cliente = supabase as unknown as { channel: (t: string) => CanalFalso };

    cliente.channel("critical_alerts_badge").on().subscribe();

    expect(() => cliente.channel("critical_alerts_badge").on()).toThrow(
      /after `subscribe\(\)`/
    );
  });
});

describe("abrirCanalPostgres", () => {
  it("nao reaproveita canal ja inscrito ao montar duas vezes", () => {
    abrirCanalPostgres("critical_alerts_badge").on().subscribe();

    expect(() =>
      abrirCanalPostgres("critical_alerts_badge").on().subscribe()
    ).not.toThrow();
  });

  it("mantem as duas instancias vivas em paralelo", () => {
    abrirCanalPostgres("alertas").on().subscribe();
    abrirCanalPostgres("alertas").on().subscribe();

    expect(canais).toHaveLength(2);
    expect(canais.every((c) => c.inscrito)).toBe(true);
  });

  it("preserva o nome base como prefixo do topico", () => {
    const canal = abrirCanalPostgres("approval_notifications_abc");
    expect(canal.topic).toMatch(/^realtime:approval_notifications_abc:/);
  });
});

describe("abrirCanalCompartilhado", () => {
  it("preserva o topico exato, pois presence/broadcast dependem dele", () => {
    const canal = abrirCanalCompartilhado("chat-presence-42");
    expect(canal.topic).toBe("realtime:chat-presence-42");
  });

  it("descarta o canal anterior em vez de reaproveita-lo inscrito", () => {
    const primeiro = abrirCanalCompartilhado("chat-presence-42");
    primeiro.on().subscribe();

    const segundo = abrirCanalCompartilhado("chat-presence-42");
    expect(segundo).not.toBe(primeiro);
    expect(() => segundo.on().subscribe()).not.toThrow();
    expect(canais).toHaveLength(1);
  });
});