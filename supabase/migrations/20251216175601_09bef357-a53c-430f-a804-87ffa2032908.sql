-- Create table for user dashboard filter favorites
CREATE TABLE public.dashboard_filter_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_filter TEXT DEFAULT 'all',
  supplier_filter TEXT DEFAULT 'all',
  period_filter TEXT DEFAULT '6m',
  show_comparison BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dashboard_filter_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own filter favorites" 
ON public.dashboard_filter_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own filter favorites" 
ON public.dashboard_filter_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter favorites" 
ON public.dashboard_filter_favorites 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter favorites" 
ON public.dashboard_filter_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dashboard_filter_favorites_updated_at
BEFORE UPDATE ON public.dashboard_filter_favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();