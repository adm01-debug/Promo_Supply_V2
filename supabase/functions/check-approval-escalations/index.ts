import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting approval escalation check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find workflows that need escalation
    const now = new Date().toISOString();
    
    // Get pending steps that have exceeded their deadline
    const { data: expiredSteps, error: stepsError } = await supabase
      .from('approval_steps')
      .select(`
        *,
        workflow:approval_workflows!approval_steps_workflow_id_fkey(
          id,
          status,
          valor,
          solicitacao_id,
          rule:approval_rules!approval_workflows_rule_id_fkey(
            escalacao_automatica,
            escalacao_para
          )
        )
      `)
      .eq('status', 'pendente')
      .lt('prazo_limite', now)
      .is('decidido_em', null);

    if (stepsError) {
      console.error('Error fetching expired steps:', stepsError);
      throw stepsError;
    }

    console.log(`Found ${expiredSteps?.length || 0} expired approval steps`);

    const escalatedWorkflows: string[] = [];
    const reminders: string[] = [];

    for (const step of expiredSteps || []) {
      const workflow = step.workflow;
      
      if (!workflow || workflow.status !== 'em_andamento') {
        continue;
      }

      const rule = workflow.rule;
      
      // Check if automatic escalation is enabled
      if (rule?.escalacao_automatica && rule?.escalacao_para) {
        console.log(`Escalating workflow ${workflow.id} to ${rule.escalacao_para}`);
        
        // Update workflow with escalation
        const { error: updateWorkflowError } = await supabase
          .from('approval_workflows')
          .update({
            status: 'escalado',
            escalado_em: now,
            escalado_para: rule.escalacao_para,
            updated_at: now
          })
          .eq('id', workflow.id);

        if (updateWorkflowError) {
          console.error(`Error escalating workflow ${workflow.id}:`, updateWorkflowError);
          continue;
        }

        // Update the step status
        const { error: updateStepError } = await supabase
          .from('approval_steps')
          .update({
            status: 'expirado'
          })
          .eq('id', step.id);

        if (updateStepError) {
          console.error(`Error updating step ${step.id}:`, updateStepError);
        }

        // Log the escalation in history
        const { error: historyError } = await supabase
          .from('approval_history')
          .insert({
            workflow_id: workflow.id,
            solicitacao_id: workflow.solicitacao_id,
            step_id: step.id,
            acao: 'escalado_automatico',
            usuario_id: null,
            usuario_nome: 'Sistema',
            detalhes: {
              motivo: 'Prazo limite excedido',
              prazo_original: step.prazo_limite,
              escalado_para: rule.escalacao_para,
              aprovador_original: step.aprovador_id
            }
          });

        if (historyError) {
          console.error(`Error logging escalation history:`, historyError);
        }

        // Create notification for the escalation target
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: rule.escalacao_para,
            type: 'escalation',
            priority: 'high',
            title: 'Aprovação Escalada',
            message: `Uma aprovação foi escalada para você por exceder o prazo limite. Valor: R$ ${workflow.valor?.toLocaleString('pt-BR')}`,
            action_url: '/aprovacoes',
            action_label: 'Ver Aprovação'
          });

        if (notifError) {
          console.error(`Error creating notification:`, notifError);
        }

        escalatedWorkflows.push(workflow.id);
      } else {
        // Send reminder if not already sent
        if (!step.lembrete_enviado) {
          console.log(`Sending reminder for step ${step.id}`);
          
          // Update step to mark reminder as sent
          const { error: reminderError } = await supabase
            .from('approval_steps')
            .update({
              lembrete_enviado: true
            })
            .eq('id', step.id);

          if (reminderError) {
            console.error(`Error marking reminder sent for step ${step.id}:`, reminderError);
          }

          // Create reminder notification
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: step.aprovador_id,
              type: 'reminder',
              priority: 'medium',
              title: 'Aprovação Pendente - Prazo Expirado',
              message: `Você tem uma aprovação pendente que excedeu o prazo limite. Por favor, analise com urgência.`,
              action_url: '/aprovacoes',
              action_label: 'Ver Aprovação'
            });

          if (notifError) {
            console.error(`Error creating reminder notification:`, notifError);
          }

          reminders.push(step.id);
        }
      }
    }

    // Check for steps approaching deadline (send warning)
    const warningTime = new Date();
    warningTime.setHours(warningTime.getHours() + 4); // 4 hours before deadline
    
    const { data: approachingSteps, error: approachingError } = await supabase
      .from('approval_steps')
      .select('*')
      .eq('status', 'pendente')
      .gt('prazo_limite', now)
      .lt('prazo_limite', warningTime.toISOString())
      .eq('lembrete_enviado', false);

    if (approachingError) {
      console.error('Error fetching approaching deadline steps:', approachingError);
    } else {
      console.log(`Found ${approachingSteps?.length || 0} steps approaching deadline`);

      for (const step of approachingSteps || []) {
        // Create warning notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: step.aprovador_id,
            type: 'warning',
            priority: 'medium',
            title: 'Aprovação com Prazo Próximo',
            message: `Você tem uma aprovação pendente com prazo expirando em breve. Por favor, analise antes do vencimento.`,
            action_url: '/aprovacoes',
            action_label: 'Ver Aprovação'
          });

        if (notifError) {
          console.error(`Error creating warning notification:`, notifError);
        }

        // Mark as warned
        await supabase
          .from('approval_steps')
          .update({ lembrete_enviado: true })
          .eq('id', step.id);
      }
    }

    const result = {
      success: true,
      escalatedWorkflows: escalatedWorkflows.length,
      remindersSent: reminders.length,
      warningsSent: approachingSteps?.length || 0,
      timestamp: now
    };

    console.log('Escalation check completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in escalation check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
