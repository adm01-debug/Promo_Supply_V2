CREATE OR REPLACE FUNCTION public.verificar_integridade_audit_logs()
 RETURNS TABLE(situacao text, total_registros bigint, verificados_ate bigint, primeiro_divergente uuid, sequencia_divergente bigint, detalhe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  linha     public.audit_logs;
  anterior  text := 'GENESIS';
  esperado  text;
  total     bigint;
  contados  bigint := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem verificar a integridade da auditoria'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO total FROM public.audit_logs;

  FOR linha IN SELECT * FROM public.audit_logs ORDER BY sequencia LOOP
    IF linha.hash_anterior IS DISTINCT FROM anterior THEN
      situacao             := 'ADULTERADO';
      total_registros      := total;
      verificados_ate      := contados;
      primeiro_divergente  := linha.id;
      sequencia_divergente := linha.sequencia;
      detalhe              := format(
        'Elo quebrado: registro aponta para hash anterior %s, mas a cadeia calculou %s. Indica remocao ou reordenacao de registro.',
        coalesce(linha.hash_anterior, '(nulo)'), anterior);
      RETURN NEXT;
      RETURN;
    END IF;

    esperado := encode(
      sha256((public.audit_log_conteudo_canonico(linha) || '|' || linha.hash_anterior)::bytea),
      'hex'
    );

    IF esperado IS DISTINCT FROM linha.registro_hash THEN
      situacao             := 'ADULTERADO';
      total_registros      := total;
      verificados_ate      := contados;
      primeiro_divergente  := linha.id;
      sequencia_divergente := linha.sequencia;
      detalhe              := format(
        'Conteudo alterado: hash gravado %s, hash recalculado %s. O registro foi modificado apos a gravacao.',
        linha.registro_hash, esperado);
      RETURN NEXT;
      RETURN;
    END IF;

    anterior := linha.registro_hash;
    contados := contados + 1;
  END LOOP;

  situacao             := 'INTEGRO';
  total_registros      := total;
  verificados_ate      := contados;
  primeiro_divergente  := NULL;
  sequencia_divergente := NULL;
  detalhe              := format('Cadeia integra: %s registro(s) verificados byte a byte.', contados);
  RETURN NEXT;
END;
$function$
