/**
 * Validação do portador (motorista/placa) para `/api/expedicaoautorizacao/Autorizar`.
 * Mesmas regras do `portador.js` do portal MinhaXBZ (CPF por dígito verificador;
 * placa antiga ABC1234 ou Mercosul ABC1D23). Função pura para ser testável.
 *
 * ⚠️ CPF/RG são dado pessoal: este módulo só valida e normaliza — nunca persiste.
 */
import type { XbzPortadorInput } from "./xbz_client.ts";

export function somenteDigitos(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function cpfValido(valor: unknown): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (quantidade: number) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i += 1) soma += Number(cpf[i]) * (quantidade + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function normalizarPlaca(valor: unknown): string {
  return String(valor ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function placaValida(valor: unknown): boolean {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(valor));
}

/** Oculta CPF/RG para logs/auditoria (`xbz_carrinho_log`). */
export function mascararPortador(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const k of ["cpf", "rg", "MotoristaCpf", "MotoristaRg"]) {
    if (k in out) out[k] = "***";
  }
  return out;
}

/**
 * Normaliza o body do proxy para o formato da XBZ ou devolve a mensagem de erro.
 * Aceita chaves em pt (`nome, rg, cpf, placa, detalhes`).
 */
export function montarPortador(body: Record<string, unknown>): { ok: true; portador: XbzPortadorInput } | { ok: false; erro: string } {
  const nome = String(body.nome ?? "").trim().slice(0, 120);
  const rg = String(body.rg ?? "").trim().slice(0, 30);
  const cpf = somenteDigitos(body.cpf);
  const placa = normalizarPlaca(body.placa);
  const detalhes = String(body.detalhes ?? "").trim().slice(0, 500);

  if (nome.length < 3) return { ok: false, erro: "Nome do motorista é obrigatório" };
  if (!cpfValido(cpf)) return { ok: false, erro: "CPF do motorista inválido" };
  if (!placaValida(placa)) return { ok: false, erro: "Placa inválida (use ABC1234 ou ABC1D23)" };

  return {
    ok: true,
    portador: { MotoristaNome: nome, MotoristaRg: rg, MotoristaCpf: cpf, VeiculoPlaca: placa, Detalhes: detalhes },
  };
}
