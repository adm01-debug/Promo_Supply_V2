CREATE OR REPLACE FUNCTION public.calc_checklist_overall_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.overall_score := ROUND((NEW.packaging_score + NEW.conformity_score + NEW.quantity_score + NEW.documentation_score)::numeric / 4, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
