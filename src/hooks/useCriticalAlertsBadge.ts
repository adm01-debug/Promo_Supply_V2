import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "critical_alerts_last_seen_at";

/**
 * Conta alertas CRITICAL/EMERGENCY não resolvidos criados após a última visita
 * do usuário ao dashboard de saúde. Assina Realtime para incremento instantâneo
 * e reproduz um beep curto em novos alertas críticos.
 */
export function useCriticalAlertsBadge() {
  const [count, setCount] = useState(0);

  const getLastSeen = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  };

  const refresh = useCallback(async () => {
    const lastSeen = getLastSeen();
    const { count: c } = await supabase
      .from("system_alerts")
      .select("id", { count: "exact", head: true })
      .in("severity", ["CRITICAL", "EMERGENCY"])
      .is("resolved_at", null)
      .gt("created_at", lastSeen);
    setCount(c ?? 0);
  }, []);

  const markAsSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setCount(0);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("critical_alerts_badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_alerts" },
        (payload) => {
          const row = payload.new as { severity?: string };
          const sev = (row.severity ?? "").toUpperCase();
          if (sev === "CRITICAL" || sev === "EMERGENCY") {
            setCount((prev) => prev + 1);
            playBeep();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { count, markAsSeen, refresh };
}

function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 220);
  } catch {
    /* ignore */
  }
}
