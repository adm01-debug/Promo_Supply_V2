// Onda 41 — Painel de assinaturas + snooze de alertas.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";

interface Subscription {
  id: string;
  user_id: string;
  alert_type: string | null;
  min_severity: string;
  channel: string;
  enabled: boolean;
  snoozed_until: string | null;
  slack_webhook_url: string | null;
  email: string | null;
  created_at: string;
}

const SEVERITIES = ["EMERGENCY", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const CHANNELS = [
  { value: "inapp", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
] as const;

const SNOOZE_PRESETS: Array<{ label: string; minutes: number }> = [
  { label: "1h", minutes: 60 },
  { label: "4h", minutes: 240 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

export default function AlertSubscriptionsPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [alertType, setAlertType] = useState("");
  const [minSeverity, setMinSeverity] = useState<string>("HIGH");
  const [channel, setChannel] = useState<string>("inapp");
  const [slackUrl, setSlackUrl] = useState("");
  const [emailAddr, setEmailAddr] = useState("");

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["alert-subscriptions", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Subscription[]> => {
      const { data, error } = await supabase
        .from("alert_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sem usuário");
      if (channel === "slack" && !/^https:\/\/hooks\.slack\.com\//.test(slackUrl.trim())) {
        throw new Error("Webhook Slack inválido (deve começar com https://hooks.slack.com/)");
      }
      const { error } = await supabase.from("alert_subscriptions").insert({
        user_id: user.id,
        alert_type: alertType.trim() || null,
        min_severity: minSeverity,
        channel,
        slack_webhook_url: channel === "slack" ? slackUrl.trim() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assinatura criada");
      setAlertType("");
      setSlackUrl("");
      qc.invalidateQueries({ queryKey: ["alert-subscriptions"] });
    },
    onError: (e: unknown) => toast.error(`Falha: ${(e as Error).message}`),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("alert_subscriptions")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-subscriptions"] }),
  });

  const snooze = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number | null }) => {
      const until =
        minutes === null ? null : new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await supabase
        .from("alert_subscriptions")
        .update({ snoozed_until: until })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["alert-subscriptions"] });
      toast.success(vars.minutes === null ? "Snooze removido" : `Silenciado por ${vars.minutes}min`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alert_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-subscriptions"] });
      toast.success("Assinatura removida");
    },
  });

  const activeCount = useMemo(
    () =>
      subs.filter(
        (s) => s.enabled && (!s.snoozed_until || new Date(s.snoozed_until) < new Date()),
      ).length,
    [subs],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Minhas assinaturas de alertas
          <Badge variant="outline" className="ml-2">
            {activeCount} ativas / {subs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-2">
          <Input
            placeholder="Tipo (vazio = todos)"
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
            aria-label="Tipo do alerta"
          />
          <Select value={minSeverity} onValueChange={setMinSeverity}>
            <SelectTrigger aria-label="Severidade mínima">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger aria-label="Canal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        {channel === "slack" && (
          <Input
            placeholder="Slack Incoming Webhook URL (https://hooks.slack.com/services/...)"
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            aria-label="Slack webhook URL"
            className="font-mono text-xs"
          />
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma assinatura ainda. Adicione uma regra acima para receber notificações.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Sev. mín.</th>
                  <th className="py-2 pr-3">Canal</th>
                  <th className="py-2 pr-3">Ativa</th>
                  <th className="py-2 pr-3">Snooze</th>
                  <th className="py-2 pr-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const isSnoozed = s.snoozed_until && new Date(s.snoozed_until) > new Date();
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">
                        {s.alert_type ?? <span className="text-muted-foreground">todos</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{s.min_severity}</Badge>
                      </td>
                      <td className="py-2 pr-3">{s.channel}</td>
                      <td className="py-2 pr-3">
                        <Switch
                          checked={s.enabled}
                          onCheckedChange={(v) => toggle.mutate({ id: s.id, enabled: v })}
                          aria-label="Habilitar assinatura"
                        />
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {isSnoozed ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            até {new Date(s.snoozed_until!).toLocaleString("pt-BR")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        {SNOOZE_PRESETS.map((p) => (
                          <Button
                            key={p.minutes}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => snooze.mutate({ id: s.id, minutes: p.minutes })}
                            aria-label={`Silenciar por ${p.label}`}
                          >
                            {p.label}
                          </Button>
                        ))}
                        {isSnoozed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => snooze.mutate({ id: s.id, minutes: null })}
                            aria-label="Remover snooze"
                          >
                            <BellOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive"
                          onClick={() => remove.mutate(s.id)}
                          aria-label="Remover assinatura"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
