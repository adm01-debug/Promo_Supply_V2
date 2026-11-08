import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { ApprovalHistory } from './approvalWorkflowTypes';

export const useApprovalHistory = () => {
  const [allHistory, setAllHistory] = useState<ApprovalHistory[]>([]);

  const fetchHistory = useCallback(async (workflowId: string): Promise<ApprovalHistory[]> => {
    try {
      const { data, error } = await supabase.from('approval_history').select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ApprovalHistory[];
    } catch (error) { logger.error('Error fetching history', { error }); return []; }
  }, []);

  const fetchAllHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('approval_history').select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setAllHistory((data || []) as ApprovalHistory[]);
    } catch (error) { logger.error('Error fetching all history', { error }); }
  }, []);

  return { allHistory, setAllHistory, fetchHistory, fetchAllHistory };
};
