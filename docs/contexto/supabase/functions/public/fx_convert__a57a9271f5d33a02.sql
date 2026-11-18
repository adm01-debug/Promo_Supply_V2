CREATE OR REPLACE FUNCTION public.fx_convert(_amount numeric, _from character, _to character, _date date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN _from = _to THEN _amount
    ELSE _amount * (
      SELECT rate FROM public.exchange_rates
      WHERE base_currency = _from AND quote_currency = _to AND rate_date <= _date
      ORDER BY rate_date DESC LIMIT 1
    ) 
  END;
$function$
