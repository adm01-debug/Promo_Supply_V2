/**
 * Testes da validação do portador (regras do `portador.js` do portal MinhaXBZ).
 * Rodar: deno test supabase/functions/_shared/xbz_portador.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cpfValido, mascararPortador, montarPortador, normalizarPlaca, placaValida } from "./xbz_portador.ts";

Deno.test("cpfValido: dígito verificador e sequências repetidas", () => {
  assertEquals(cpfValido("529.982.247-25"), true); // CPF de exemplo válido pelo DV
  assertEquals(cpfValido("52998224725"), true);
  assertEquals(cpfValido("52998224724"), false);
  assertEquals(cpfValido("111.111.111-11"), false);
  assertEquals(cpfValido("123"), false);
  assertEquals(cpfValido(null), false);
});

Deno.test("placaValida: antiga (ABC1234) e Mercosul (ABC1D23), normalizada", () => {
  assertEquals(placaValida("abc-1234"), true);
  assertEquals(placaValida("ABC1D23"), true);
  assertEquals(placaValida("ab c 1d 23"), true);
  assertEquals(placaValida("ABCD123"), false);
  assertEquals(placaValida("AB1234"), false);
  assertEquals(normalizarPlaca(" abc-1d23 "), "ABC1D23");
});

Deno.test("montarPortador: normaliza para o formato da XBZ", () => {
  const r = montarPortador({ nome: "  João da Silva ", rg: "12.345.678-9", cpf: "529.982.247-25", placa: "abc-1d23", detalhes: "Fiorino branca" });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.portador, {
      MotoristaNome: "João da Silva",
      MotoristaRg: "12.345.678-9",
      MotoristaCpf: "52998224725",
      VeiculoPlaca: "ABC1D23",
      Detalhes: "Fiorino branca",
    });
  }
});

Deno.test("montarPortador: rejeita nome curto, CPF e placa inválidos", () => {
  assertEquals(montarPortador({ nome: "Jo", cpf: "52998224725", placa: "ABC1234" }).ok, false);
  assertEquals(montarPortador({ nome: "João", cpf: "123", placa: "ABC1234" }).ok, false);
  assertEquals(montarPortador({ nome: "João", cpf: "52998224725", placa: "ABCD" }).ok, false);
});

Deno.test("mascararPortador: oculta CPF/RG para a auditoria", () => {
  assertEquals(
    mascararPortador({ action: "portadorAutorizar", nome: "João", cpf: "52998224725", rg: "123", placa: "ABC1234" }),
    { action: "portadorAutorizar", nome: "João", cpf: "***", rg: "***", placa: "ABC1234" },
  );
});
