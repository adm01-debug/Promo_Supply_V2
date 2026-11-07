import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let failures = 0;

function check(ok: boolean, label: string, detail?: string) {
  if (ok) {
    console.log(`✅ ${label}`);
  } else {
    failures++;
    console.error(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function validateBridgeContract() {
  console.log("🔍 Iniciando validação do contrato da Edge Function: external-db-bridge...");

  try {
    // 1. Testar operação inválida (Error Handling)
    console.log("\nTesting invalid operation (Error 400)...");
    const { data: errData, error: errResponse } = await supabase.functions.invoke('external-db-bridge', {
      body: { operation: 'invalid_op' }
    });

    check(!!(errResponse || (errData && errData.error)), "Erro tratado para operação inválida", errResponse?.message || errData?.error);

    // 2. Testar Select (Structure Validation)
    console.log("\nTesting 'select' operation structure...");
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        operation: 'select',
        table: 'test_table',
        limit: 1
      }
    });

    if (error) {
      if (error.message?.includes("External database not configured")) {
        console.log("⚠️ Bridge não configurada com DB externo, validando apenas lógica de erro 500.");
        check(true, "Resposta de erro 500 segue o padrão");
      } else {
        check(false, "Erro inesperado", error.message);
      }
    } else if (data) {
      const requiredFields = ['data', 'meta'];
      const metaFields = ['durationMs', 'status'];
      const hasAllFields = requiredFields.every(f => f in data);
      const hasAllMetaFields = data.meta && metaFields.every(f => f in data.meta);
      check(hasAllFields && hasAllMetaFields, "Contrato de sucesso validado", JSON.stringify(data));
    } else {
      check(false, "Resposta vazia sem erro nem dados");
    }

    // 3. Validar operação 'insert' (estrutura mínima)
    console.log("\nTesting 'insert' operation structure...");
    const ins = await supabase.functions.invoke('external-db-bridge', {
      body: { operation: 'insert', table: 'test_table', data: { id: 1 } }
    });
    if (ins.error) {
      check(!!ins.error.message?.includes("External database not configured"), "Insert respondeu com erro esperado (sem DB externo)", ins.error.message);
    } else {
      check(!!ins.data, "Insert retornou dados");
    }

  } catch (e) {
    failures++;
    console.error("❌ Erro crítico durante a validação:", e.message);
  }

  console.log("\n========================================");
  if (failures > 0) {
    console.error(`❌ Validação falhou: ${failures} check(s) com erro.`);
    process.exit(1);
  }
  console.log("✅ Validação concluída sem falhas.");
  process.exit(0);
}

validateBridgeContract();
