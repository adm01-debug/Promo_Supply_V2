import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const logger = new EdgeLogger('guided-buying-ai', requestId);

    const { message, history, context } = await req.json();

    logger.info("Guided buying request received", { messageLength: message?.length });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch some catalog context to help the AI
    const { data: products } = await supabaseAdmin
      .from("produtos")
      .select("nome, descricao, codigo, unidade, preco_referencia")
      .limit(20);

    const { data: suppliers } = await supabaseAdmin
      .from("fornecedores")
      .select("razao_social, nome_fantasia, categorias_atendidas")
      .limit(10);

    // System prompt for Guided Buying
    const systemPrompt = `
      Você é o Assistente de Compras Inteligente do sistema Promo Supply.
      Seu objetivo é ajudar o usuário a encontrar o que precisa e guiar o processo de compra (Procurement).
      
      Contexto do Catálogo: ${JSON.stringify(products)}
      Contexto de Fornecedores: ${JSON.stringify(suppliers)}
      
      Instruções:
      1. Seja proativo e profissional.
      2. Se o usuário quiser comprar algo, verifique se temos no catálogo.
      3. Se não tivermos, sugira categorias ou fornecedores que possam atender.
      4. No final, se as informações forem suficientes, sugira criar uma "Solicitação de Compra".
      
      Formato de Resposta:
      - Responda em Markdown.
      - Se identificar uma intenção de criação de solicitação, inclua um bloco JSON especial no final:
        \`\`\`json
        { "action": "create_solicitation", "data": { "titulo": "...", "quantidade": 1, "tipo": "material" } }
        \`\`\`
    `;

    // Here we would call the Lovable AI Gateway (OpenAI/Anthropic)
    // For now, we simulate a smart response.
    
    let aiResponse = "";
    if (message.toLowerCase().includes("notebook") || message.toLowerCase().includes("computador")) {
      aiResponse = "Entendi que você precisa de um Notebook. Temos opções no catálogo como 'Notebook Dell Latitude'. \n\nPosso iniciar uma solicitação de compra para você?";
    } else if (message.toLowerCase().includes("caneta") || message.toLowerCase().includes("escritório")) {
      aiResponse = "Temos diversos itens de papelaria. Recomendo o fornecedor 'Stricker' para estes itens. \n\nDeseja que eu monte o rascunho da solicitação?";
    } else {
      aiResponse = "Olá! Como posso ajudar você com suas compras hoje? Posso buscar itens no catálogo, encontrar fornecedores ou ajudar a criar novas solicitações.";
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (typeof logger !== 'undefined') {
      logger.error("Error in guided-buying-ai", { error: errorMessage });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});