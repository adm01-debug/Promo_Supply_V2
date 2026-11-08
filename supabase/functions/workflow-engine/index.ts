import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { buildResponseHeaders } from "../_shared/http.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { WorkflowContract } from "../_shared/contracts.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: buildResponseHeaders(corsHeaders),
    });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger("workflow-engine", requestId);

  try {
    // SECURITY: authenticate caller and resolve tenant from DB (never trust header alone)
    const { getAuthUser, getTenantId } = await import("../_shared/security.ts");
    const { user } = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: buildResponseHeaders(corsHeaders),
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Contract Validation: Ensures type safety and catches malformed payloads before logic execution
    const data = await validateBody(req, WorkflowContract, logger);
    const { action, template_id, instance_id, entity_type, entity_id, node_id, decision, approver_id, comment } = data;

    const tenant_id = await getTenantId(supabase, user, req);





    if (action === 'start_workflow') {
      if (!template_id) throw new Error('Validation error: template_id is required for start_workflow');
      
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

      const { data: startNode, error: nodeError } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('template_id', template_id)
        .eq('type', 'start')
        .single()

      if (nodeError) throw nodeError

      await supabase.from('workflow_logs').insert({
        instance_id: instance.id,
        tenant_id,
        node_id: startNode.id,
        event_type: 'node_entry',
        message: 'Workflow started'
      })

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

      return new Response(JSON.stringify({ 
        data: { instance_id: instance.id }, 
        requestId,
        status: "success",
        timestamp: new Date().toISOString()
      }), {
        headers: buildResponseHeaders(corsHeaders),
        status: 200,
      })

    }

    if (action === 'submit_decision') {
      if (!instance_id || !node_id || !decision) {
        throw new Error('Validation error: instance_id, node_id and decision are required');
      }

      const { data: sodOk, error: sodError } = await supabase.rpc('check_workflow_sod', {
        p_instance_id: instance_id,
        p_approver_id: approver_id,
        p_entity_id: entity_id
      })

      if (sodError) throw sodError
      if (!sodOk) {
        return errorResponse(new Error('Security error: SoD Violation: Approver cannot approve this step.'), logger);

      }

      await supabase.from('workflow_approvals')
        .update({
          status: decision === 'approve' ? 'approved' : 'rejected',
          approver_id,
          comment,
          decided_at: new Date().toISOString()
        })
        .eq('instance_id', instance_id)
        .eq('node_id', node_id)
      
      return new Response(JSON.stringify({ 
        data: { success: true }, 
        requestId,
        status: "success",
        timestamp: new Date().toISOString()
      }), {
        headers: buildResponseHeaders(corsHeaders),
        status: 200,
      })
    }

    throw new Error('Validation error: Invalid action');


  } catch (error) {
    return errorResponse(error, logger);
  }
})
