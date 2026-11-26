-- Create contact_notes table for supplier contact notes
CREATE TABLE public.contact_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view contact notes"
ON public.contact_notes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contact notes"
ON public.contact_notes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

CREATE POLICY "Users can update their own notes"
ON public.contact_notes
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own notes or admins"
ON public.contact_notes
FOR DELETE
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_contact_notes_updated_at
BEFORE UPDATE ON public.contact_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes(contact_id);
CREATE INDEX idx_contact_notes_fornecedor_id ON public.contact_notes(fornecedor_id);