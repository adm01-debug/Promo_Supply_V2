import { useEffect, useState } from 'react';

/**
 * Devolve o valor depois de `delay` ms sem mudanca. Usado para nao disparar uma
 * consulta por tecla digitada (padrao ja aplicado na busca global).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
