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
      const { data: original, error: fetchError } = await supabase
        .from('solicitacoes')
        .select(`
          *,
          itens:itens_solicitacao(*)
        `)
        .eq('id', solicitacaoId)
        .single();

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
      
      const novaSolicitacao = {
        numero: novoNumero,
        titulo: titulo.substring(0, 200), // Limitar tamanho
        descricao: original.descricao,
        categoria_id: original.categoria_id,
        prioridade: novaPrioridade || original.prioridade,
        valor_estimado: original.valor_estimado,
        quantidade: original.quantidade,
        unidade_medida: original.unidade_medida,
        centro_custo: original.centro_custo,
        projeto: original.projeto,
        justificativa: original.justificativa,
        observacoes: original.observacoes ? `[Copiado de ${original.numero}] ${original.observacoes}` : `Copiado de ${original.numero}`,
        // Resetar campos de status
        status: 'rascunho',
        solicitante_id: user.id,
        // Datas
        data_necessidade: resetarDatas ? null : original.data_necessidade,
        // Não copiar campos de workflow
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

      // 5. Copiar itens se solicitado
      if (copiarItens && original.itens && original.itens.length > 0) {
        const novosItens = original.itens.map((item: any) => ({
          solicitacao_id: novaSol.id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade_medida: item.unidade_medida,
          valor_estimado: item.valor_estimado,
          especificacoes: item.especificacoes,
          codigo_produto: item.codigo_produto,
          observacoes: item.observacoes,
        }));

        const { error: itensError } = await supabase
          .from('itens_solicitacao')
          .insert(novosItens);

        if (itensError) {
          console.error('Erro ao copiar itens:', itensError);
          // Não falha a operação, apenas loga
        }
      }

      // 6. Copiar anexos se solicitado (referência, não arquivo físico)
      if (copiarAnexos) {
        const { data: anexosOriginal } = await supabase
          .from('anexos')
          .select('*')
          .eq('entidade_tipo', 'solicitacao')
          .eq('entidade_id', solicitacaoId);

        if (anexosOriginal && anexosOriginal.length > 0) {
          // Nota: Copia a referência ao arquivo, não duplica o arquivo físico
          const novosAnexos = anexosOriginal.map((anexo: any) => ({
            entidade_tipo: 'solicitacao',
            entidade_id: novaSol.id,
            nome_arquivo: anexo.nome_arquivo,
            tipo_arquivo: anexo.tipo_arquivo,
            tamanho: anexo.tamanho,
            url: anexo.url,
            storage_path: anexo.storage_path,
            uploaded_by: user.id,
          }));

          await supabase.from('anexos').insert(novosAnexos);
        }
      }

      // 7. Registrar no audit log
      await supabase.from('audit_logs').insert({
        action: 'duplicate',
        entity_type: 'solicitacao',
        entity_id: novaSol.id,
        user_id: user.id,
        details: {
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
