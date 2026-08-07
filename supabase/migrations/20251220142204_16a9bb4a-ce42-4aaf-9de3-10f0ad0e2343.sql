-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'service', -- service, supply, framework
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_approval, active, expired, cancelled, renewed
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  renewal_type TEXT DEFAULT 'manual', -- manual, automatic
  renewal_notice_days INTEGER DEFAULT 30,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract items table
CREATE TABLE public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract documents table
CREATE TABLE public.contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract history table for amendments/renewals
CREATE TABLE public.contract_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- created, updated, approved, renewed, cancelled, expired
  action_description TEXT,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_contracts junction table to link orders with contracts
CREATE TABLE public.order_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, contract_id)
);

-- Enable RLS on all tables
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contracts
CREATE POLICY "Authenticated users can view contracts"
ON public.contracts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contracts"
ON public.contracts FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete contracts"
ON public.contracts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for contract_items
CREATE POLICY "Authenticated users can view contract items"
ON public.contract_items FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contract items"
ON public.contract_items FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS Policies for contract_documents
CREATE POLICY "Authenticated users can view contract documents"
ON public.contract_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contract documents"
ON public.contract_documents FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS Policies for contract_history
CREATE POLICY "Authenticated users can view contract history"
ON public.contract_history FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contract history"
ON public.contract_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for order_contracts
CREATE POLICY "Authenticated users can view order contracts"
ON public.order_contracts FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage order contracts"
ON public.order_contracts FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();