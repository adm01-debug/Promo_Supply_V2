import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Contador regressivo simples para bloquear ações repetidas na UI.
 *
 * Uso típico: espelhar no frontend uma janela de deduplicação existente no
 * backend (ex.: geração de pedidos), evitando que o usuário dispare uma
 * requisição que já seria rejeitada com HTTP 409.
 *
 * @param seconds duração padrão do bloqueio, em segundos.
 */
export function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const deadlineRef = useRef(0);

  const start = useCallback((override?: number) => {
    const duration = Math.max(0, Math.trunc(override ?? seconds));
    if (duration === 0) return;
    deadlineRef.current = Date.now() + duration * 1000;
    setRemaining(duration);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      // Baseado em deadline absoluto: imune a throttling de aba em background.
      const left = Math.ceil((deadlineRef.current - Date.now()) / 1000);
      setRemaining(left > 0 ? left : 0);
    }, 500);
    return () => window.clearInterval(id);
  }, [remaining]);

  return { remaining, active: remaining > 0, start };
}
