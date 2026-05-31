import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useGuidedBuying() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const newUserMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('guided-buying-ai', {
        body: { message: text, history: messages }
      });

      if (error) throw error;

      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Handle special actions in JSON if any
      // ... logic to parse JSON blocks from markdown if present

    } catch (err: any) {
      toast.error('Erro no assistente: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}