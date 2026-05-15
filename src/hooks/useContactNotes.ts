import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';

export interface ContactNote {
  id: string;
  contact_id: string;
  fornecedor_id: string | null;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactNoteInput {
  contact_id: string;
  fornecedor_id?: string;
  content: string;
}

export function useContactNotes(contactId?: string, fornecedorId?: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('contact_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      if (fornecedorId) {
        query = query.eq('fornecedor_id', fornecedorId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setNotes((data as ContactNote[]) || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching contact notes:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, contactId, fornecedorId]);

  // Create new note
  const createNote = useCallback(async (input: CreateContactNoteInput) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: input.contact_id,
          fornecedor_id: input.fornecedor_id,
          author_id: user.id,
          content: input.content,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Nota adicionada!');
      fetchNotes();
      return data as ContactNote;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error creating note:', err);
      toast.error('Erro ao adicionar nota: ' + errorMessage);
      return null;
    }
  }, [user, fetchNotes]);

  // Update note
  const updateNote = useCallback(async (id: string, content: string) => {
    try {
      const { error } = await supabase
        .from('contact_notes')
        .update({ content })
        .eq('id', id);

      if (error) throw error;

      toast.success('Nota atualizada!');
      fetchNotes();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error updating note:', err);
      toast.error('Erro ao atualizar nota: ' + errorMessage);
      return false;
    }
  }, [fetchNotes]);

  // Delete note
  const deleteNote = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Nota excluída!');
      fetchNotes();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error deleting note:', err);
      toast.error('Erro ao excluir nota: ' + errorMessage);
      return false;
    }
  }, [fetchNotes]);

  // Initial fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('contact-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_notes'
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotes]);

  return {
    notes,
    loading,
    error,
    refetch: fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}
