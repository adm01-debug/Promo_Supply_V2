import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = new EdgeLogger("process-invoice-idp");


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();
    if (!filePath) throw new Error("filePath is required");

    logger.info("Iniciando processamento de nota fiscal", { filePath });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("fiscal-documents")
      .download(filePath);

    if (downloadError) {
      logger.error("Erro ao baixar arquivo do storage", { error: downloadError, filePath });
      throw downloadError;
    }

    logger.info("Arquivo baixado com sucesso, simulando extração IA", { byteLength: fileData.size });

    // Use Lovable AI Gateway to process document
    // Simulate AI response
    const mockExtractedData = {
      numero_nf: `PDF-${Math.floor(Math.random() * 100000)}`,
      chave_acesso: "35231200000000000000000000000000000000000000",
      data_emissao: new Date().toISOString().split('T')[0],
      valor_total: 1250.50,
      valor_produtos: 1200.00,
      valor_frete: 50.50,
      items: [
        { descricao: "Extracted Item 1", quantidade: 10, valor_unitario: 120.00, valor_total: 1200.00 }
      ],
      requestId: logger.getRequestId()
    };

    logger.info("Extração concluída", { extractedKeys: Object.keys(mockExtractedData) });

    return new Response(JSON.stringify(mockExtractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logger.error("Erro fatal no processamento IDP", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});