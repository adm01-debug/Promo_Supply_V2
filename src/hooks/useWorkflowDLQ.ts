import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export type WorkflowDLQOperationType = 'create_workflow' | 'approve_step' | 'reject_step' | 'escalate';

export interface WorkflowDLQEntry {
  id: string;
  type: WorkflowDLQOperationType;
  payload: Record<string, unknown>;
  failedAt: number;
  retryCount: number;
  lastError: string;
  nextRetryAt: number;
}

const WORKFLOW_DLQ_KEY = 'workflow_dead_letter_queue';
const MAX_RETRIES = 3;

function backoffDelay(retries: number): number {
  return Math.min(1000 * 2 ** retries, 30_000);
}

function generateId(): string {
  return `wdlq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadDLQ(): WorkflowDLQEntry[] {
  try {
    const raw = localStorage.getItem(WORKFLOW_DLQ_KEY);
    return raw ? (JSON.parse(raw) as WorkflowDLQEntry[]) : [];
  } catch {
    return [];
  }
}

function saveDLQ(entries: WorkflowDLQEntry[]): void {
  try {
    localStorage.setItem(WORKFLOW_DLQ_KEY, JSON.stringify(entries));
  } catch (err) {
    logger.error('useWorkflowDLQ: falha ao persistir DLQ', { err });
  }
}

export function useWorkflowDLQ() {
  const [dlqEntries, setDlqEntries] = useState<WorkflowDLQEntry[]>(() => loadDLQ());

  const pushToDLQ = useCallback(
    (type: WorkflowDLQOperationType, payload: Record<string, unknown>, error: string) => {
      const entry: WorkflowDLQEntry = {
        id: generateId(),
        type,
        payload,
        failedAt: Date.now(),
        retryCount: 0,
        lastError: error,
        nextRetryAt: Date.now() + backoffDelay(0),
      };
      const updated = [...loadDLQ(), entry];
      saveDLQ(updated);
      setDlqEntries(updated);
      logger.warn('useWorkflowDLQ: operação enviada para DLQ', { type, id: entry.id, error });
    },
    [],
  );

  const retryEntry = useCallback(
    async (
      entryId: string,
      handler: (payload: Record<string, unknown>) => Promise<boolean>,
    ): Promise<boolean> => {
      const current = loadDLQ();
      const entry = current.find(e => e.id === entryId);
      if (!entry) return false;

      if (entry.retryCount >= MAX_RETRIES) {
        logger.error('useWorkflowDLQ: entrada excedeu máximo de tentativas', { id: entryId, type: entry.type });
        return false;
      }

      try {
        const success = await handler(entry.payload);
        if (success) {
          const updated = current.filter(e => e.id !== entryId);
          saveDLQ(updated);
          setDlqEntries(updated);
          logger.info('useWorkflowDLQ: retry bem-sucedido — entrada removida do DLQ', { id: entryId });
          return true;
        }
        throw new Error('handler returned false');
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const updated = current.map(e =>
          e.id === entryId
            ? {
                ...e,
                retryCount: e.retryCount + 1,
                lastError: errMsg,
                nextRetryAt: Date.now() + backoffDelay(e.retryCount + 1),
              }
            : e,
        );
        saveDLQ(updated);
        setDlqEntries(updated);
        logger.warn('useWorkflowDLQ: retry falhou', { id: entryId, retryCount: entry.retryCount + 1, errMsg });
        return false;
      }
    },
    [],
  );

  const removeEntry = useCallback((entryId: string) => {
    const updated = loadDLQ().filter(e => e.id !== entryId);
    saveDLQ(updated);
    setDlqEntries(updated);
  }, []);

  const clearDLQ = useCallback(() => {
    saveDLQ([]);
    setDlqEntries([]);
  }, []);

  const retryableEntries = dlqEntries.filter(
    e => e.retryCount < MAX_RETRIES && e.nextRetryAt <= Date.now(),
  );

  return {
    dlqEntries,
    retryableEntries,
    pushToDLQ,
    retryEntry,
    removeEntry,
    clearDLQ,
  };
}
