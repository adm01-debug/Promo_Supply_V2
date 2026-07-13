import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';
import { logger } from '@/lib/logger';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GuidedBuyingResponse {
  response: string;
}

export interface GuidedBuyingAction {
  action: string;
  data: Record<string, unknown>;
}

const isGuidedBuyingResponse = (v: unknown): v is GuidedBuyingResponse => {
  return typeof v === 'object' && v !== null && typeof (v as { response?: unknown }).response === 'string';
};

const extractAction = (raw: string): GuidedBuyingAction | null => {
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { action?: unknown }).action === 'string' &&
      typeof (parsed as { data?: unknown }).data === 'object'
    ) {
      return parsed as GuidedBuyingAction;
    }
  } catch (err) {
    logger.warn('guided-buying: failed to parse action block', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return null;
};

export function useGuidedBuying() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<GuidedBuyingAction | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const newUserMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke<unknown>('guided-buying-ai', {
        body: { message: text, history: messages },
      });

      if (error) throw error;
      if (!isGuidedBuyingResponse(data)) {
        throw new Error('Resposta inválida do assistente');
      }

      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      setLastAction(extractAction(data.response));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('guided-buying: sendMessage failed', { error: message });
      toast.error('Erro no assistente: ' + message);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setLastAction(null);
  }, []);

  return { messages, isLoading, sendMessage, clearChat, lastAction };
}
