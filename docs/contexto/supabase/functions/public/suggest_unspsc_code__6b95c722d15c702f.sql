CREATE OR REPLACE FUNCTION public.suggest_unspsc_code(item_name text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF item_name ILIKE '%notebook%' OR item_name ILIKE '%laptop%' THEN
        RETURN '43211503';
    ELSIF item_name ILIKE '%computador%' OR item_name ILIKE '%desktop%' THEN
        RETURN '43211507';
    ELSIF item_name ILIKE '%mouse%' THEN
        RETURN '43211708';
    ELSIF item_name ILIKE '%teclado%' THEN
        RETURN '43211706';
    ELSIF item_name ILIKE '%caneta%' THEN
        RETURN '44121701';
    ELSE
        RETURN NULL;
    END IF;
END;
$function$
