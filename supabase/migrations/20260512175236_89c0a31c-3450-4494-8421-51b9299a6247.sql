-- Create dashboard filter favorites table
CREATE TABLE IF NOT EXISTS public.dashboard_filter_favorites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_filter TEXT,
    supplier_filter TEXT,
    period_filter TEXT,
    show_comparison BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_filter_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own dashboard filters"
ON public.dashboard_filter_favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dashboard filters"
ON public.dashboard_filter_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard filters"
ON public.dashboard_filter_favorites
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard filters"
ON public.dashboard_filter_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dashboard_filter_favorites_updated_at
BEFORE UPDATE ON public.dashboard_filter_favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
