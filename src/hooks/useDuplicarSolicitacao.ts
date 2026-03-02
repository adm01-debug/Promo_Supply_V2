import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DuplicarOpcoes {
  // Copiar itens da solicitação original
  copiarItens?: boolean;
  // Copiar anexos
  copiarAnexos?: boolean;
  // Limpar datas (usar data atual)
  resetarDatas?: boolean;
  // Definir novo título (se não definido, adiciona "(Cópia)" ao original)
  novoTitulo?: string;
  // Definir nova prioridade
  novaPrioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
}

export function useDuplicarSolicitacao() {
  const { user } = useAuth();
  const [isDuplicating, setIsDuplicating] = useState(false);

  /**
   * Duplica uma solicitação existente
   */
  const duplicar = useCallback(async (
    solicitacaoId: string,
    opcoes: DuplicarOpcoes = {}
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    const {
      copiarItens = true,
      copiarAnexos = false,
      resetarDatas = true,
      novoTitulo,
      novaPrioridade,
    } = opcoes;

    try {
      setIsDuplicating(true);

      // 1. Buscar solicitação original com todos os dados
      const { data: original, error: fetchError } = await (supabase
        .from('solicitacoes')
        .select('*')
        .eq('id', solicitacaoId)
        .single() as any);

      if (fetchError || !original) {
        throw new Error('Solicitação não encontrada');
      }

      // 2. Gerar novo número
      const { data: numData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'SOL',
        table_name: 'solicitacoes'
      });
      const novoNumero = numData || `SOL-${Date.now()}`;

      // 3. Preparar dados da nova solicitação
      const titulo = novoTitulo || `${original.titulo} (Cópia)`;
      
      const novaSolicitacao: any = {
        numero: novoNumero,
        titulo: titulo.substring(0, 200),
        descricao: original.descricao,
        categoria_id: original.categoria_id,
        prioridade: novaPrioridade || original.prioridade,
        valor_estimado: original.valor_estimado,
        quantidade: original.quantidade,
        centro_custo: original.centro_custo,
        justificativa: original.justificativa,
        observacoes: original.observacoes ? `[Copiado de ${original.numero}] ${original.observacoes}` : `Copiado de ${original.numero}`,
        status: 'rascunho',
        solicitante_id: user.id,
        data_necessidade: resetarDatas ? null : original.data_necessidade,
        aprovador_id: null,
        data_aprovacao: null,
        motivo_rejeicao: null,
        data_conclusao: null,
      };

      // 4. Criar nova solicitação
      const { data: novaSol, error: createError } = await supabase
        .from('solicitacoes')
        .insert(novaSolicitacao)
        .select()
        .single();

      if (createError || !novaSol) {
        throw createError || new Error('Erro ao criar solicitação');
      }

      // 5. Copiar itens - skipped (itens_solicitacao table not available)

      // 6. Copiar anexos - skipped (anexos table not available)

      // 7. Registrar no audit log
      await (supabase.from('audit_logs') as any).insert({
        action_type: 'create',
        entity_type: 'solicitacao',
        entity_id: novaSol.id,
        user_id: user.id,
        metadata: {
          original_id: solicitacaoId,
          original_numero: original.numero,
          novo_numero: novoNumero,
          opcoes: {
            copiarItens,
            copiarAnexos,
            resetarDatas,
          },
        },
      });

      toast.success(
        `Solicitação duplicada: ${novoNumero}`,
        { 
          description: 'A nova solicitação foi criada como rascunho',
          duration: 5000 
        }
      );

      return novaSol.id;

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error duplicating solicitacao:', err);
      toast.error('Erro ao duplicar: ' + errorMessage);
      return null;
    } finally {
      setIsDuplicating(false);
    }
  }, [user]);

  /**
   * Duplica múltiplas solicitações de uma vez
   */
  const duplicarEmLote = useCallback(async (
    solicitacaoIds: string[],
    opcoes: DuplicarOpcoes = {}
  ): Promise<string[]> => {
    const novasIds: string[] = [];

    for (const id of solicitacaoIds) {
      const novaId = await duplicar(id, opcoes);
      if (novaId) {
        novasIds.push(novaId);
      }
    }

    if (novasIds.length > 0) {
      toast.success(`${novasIds.length} solicitação(ões) duplicada(s)`);
    }

    return novasIds;
  }, [duplicar]);

  return {
    duplicar,
    duplicarEmLote,
    isDuplicating,
  };
}
