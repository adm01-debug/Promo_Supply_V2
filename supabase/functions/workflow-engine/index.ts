import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
}

serve(async (req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger("workflow-engine", requestId);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, template_id, instance_id, entity_type, entity_id, node_id, decision, approver_id, comment } = await req.json()
    const tenant_id = req.headers.get('x-tenant-id')

    if (!tenant_id) {
      throw new Error('Missing tenant_id header')
    }

    if (action === 'start_workflow') {
      // 1. Criar instância
      const { data: instance, error: instError } = await supabase
        .from('workflow_instances')
        .insert({
          template_id,
          tenant_id,
          entity_type,
          entity_id,
          status: 'running'
        })
        .select()
        .single()

      if (instError) throw instError

      // 2. Localizar nó inicial
      const { data: startNode, error: nodeError } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('template_id', template_id)
        .eq('type', 'start')
        .single()

      if (nodeError) throw nodeError

      // 3. Registrar log e avançar para o próximo nó
      await supabase.from('workflow_logs').insert({
        instance_id: instance.id,
        tenant_id,
        node_id: startNode.id,
        event_type: 'node_entry',
        message: 'Workflow started'
      })

      // Lógica de transição simplificada para o próximo nó
      const { data: edge, error: edgeError } = await supabase
        .from('workflow_edges')
        .select('target_node_id')
        .eq('source_node_id', startNode.id)
        .single()

      if (edge) {
        await supabase.from('workflow_instances')
          .update({ current_node_id: edge.target_node_id })
          .eq('id', instance.id)
      }

      return new Response(JSON.stringify({ instance_id: instance.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'submit_decision') {
      // 1. Validar SoD via RPC
      const { data: sodOk, error: sodError } = await supabase.rpc('check_workflow_sod', {
        p_instance_id: instance_id,
        p_approver_id: approver_id,
        p_entity_id: entity_id
      })

      if (sodError) throw sodError
      if (!sodOk) {
        return new Response(JSON.stringify({ error: 'SoD Violation: Approver cannot approve this step.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      // 2. Registrar decisão
      await supabase.from('workflow_approvals')
        .update({
          status: decision === 'approve' ? 'approved' : 'rejected',
          approver_id,
          comment,
          decided_at: new Date().toISOString()
        })
        .eq('instance_id', instance_id)
        .eq('node_id', node_id)

      // 3. Avançar workflow ou encerrar
      // (Implementação real teria motor de regras aqui)
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    logger.error("Fatal error in workflow-engine", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
