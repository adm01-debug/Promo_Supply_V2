import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { WorkflowContract } from "../_shared/contracts.ts";
import { requireUser, requireTenantMembership, serviceClient, errorToResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger("workflow-engine", requestId);

  try {
    const { user } = await requireUser(req);
    const supabase = serviceClient();

    // Contract Validation: ensures type safety before logic.
    const data = await validateBody(req, WorkflowContract, logger);
    const { action, template_id, instance_id, entity_type, entity_id, node_id, decision, comment, tenant_id: bodyTenant } = data;

    // Identity and tenant come from auth, not the client.
    const tenant_id = bodyTenant;
    if (!tenant_id) {
      throw new Error('Validation error: tenant_id is required in body');
    }
    await requireTenantMembership(user.id, tenant_id);
    const approver_id = user.id;

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

      if (nodeError || !startNode) {
        // Roll back the orphan instance before surfacing the error so we
        // don't leak a running instance with no current_node_id.
        await supabase.from('workflow_instances').delete().eq('id', instance.id);
        throw nodeError ?? new Error('Start node not found');
      }

      await supabase.from('workflow_logs').insert({
        instance_id: instance.id,
        tenant_id,
        node_id: startNode.id,
        event_type: 'node_entry',
        message: 'Workflow started'
      })

      const { data: edge } = await supabase
        .from('workflow_edges')
        .select('target_node_id')
        .eq('source_node_id', startNode.id)
        .single()

      if (edge) {
        await supabase.from('workflow_instances')
          .update({ current_node_id: edge.target_node_id })
          .eq('id', instance.id)
      }

      return new Response(JSON.stringify({ instance_id: instance.id, requestId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        return new Response(JSON.stringify({ error: 'SoD Violation: Approver cannot approve this step.', requestId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
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

      return new Response(JSON.stringify({ success: true, requestId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action', requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    // Auth errors get a specific status; other errors flow through the
    // existing error responder.
    if (error && typeof error === 'object' && 'status' in error) {
      return errorToResponse(error, corsHeaders);
    }
    return errorResponse(error, logger);
  }
})
