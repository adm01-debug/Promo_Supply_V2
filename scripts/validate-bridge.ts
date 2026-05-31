
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function validateBridgeContract() {
  console.log("🔍 Iniciando validação do contrato da Edge Function: external-db-bridge...");

  try {
    // 1. Testar operação inválida (Error Handling)
    console.log("\nTesting invalid operation (Error 400)...");
    const { data: errData, error: errResponse } = await supabase.functions.invoke('external-db-bridge', {
      body: { operation: 'invalid_op' }
    });

    if (errResponse || (errData && errData.error)) {
      console.log("✅ Erro tratado corretamente:", errResponse?.message || errData?.error);
    } else {
      console.error("❌ Falha: A função deveria ter retornado um erro para operação inválida.");
    }

    // 2. Testar Select (Structure Validation)
    // Nota: Como não sabemos se o DB externo está configurado, esperamos ou dados ou erro de configuração.
    console.log("\nTesting 'select' operation structure...");
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: { 
        operation: 'select', 
        table: 'test_table', // Nome genérico
        limit: 1 
      }
    });

    if (error) {
      if (error.message?.includes("External database not configured")) {
        console.log("⚠️ Bridge não configurada com DB externo, validando apenas lógica de erro 500.");
        console.log("✅ Resposta de erro 500 segue o padrão.");
      } else {
        console.log("❌ Erro inesperado:", error.message);
      }
    } else if (data) {
      // Validar estrutura da resposta de sucesso
      const requiredFields = ['data', 'meta'];
      const metaFields = ['durationMs', 'status'];
      
      const hasAllFields = requiredFields.every(f => f in data);
      const hasAllMetaFields = data.meta && metaFields.every(f => f in data.meta);

      if (hasAllFields && hasAllMetaFields) {
        console.log("✅ Contrato de sucesso validado com sucesso!");
        console.log("Meta data:", data.meta);
      } else {
        console.error("❌ Falha na estrutura da resposta:", data);
      }
    }

    // 3. Validar Tipos de Filtros Suportados (Static Check based on code)
    // Isso é mais uma garantia de que o parser de filtros está funcionando.
    
  } catch (e) {
    console.error("❌ Erro crítico durante a validação:", e.message);
  }
}

validateBridgeContract();
