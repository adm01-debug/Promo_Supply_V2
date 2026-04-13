import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package, Check, AlertCircle, Loader2, Search, Camera,
  WifiOff, Wifi, RefreshCw, ChevronRight, CheckCircle2,
  ClipboardCheck, X, Save, Truck, Calendar, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/compras/MainLayout";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReceivingFormView } from "./recebimento/ReceivingFormView";

import {
  type PendingOrder,
  type OrderItem,
  type ReceivingEntry,
  OFFLINE_STORAGE_KEY,
  getOfflineEntries,
  saveOfflineEntries,
} from "./recebimento/recebimentoHelpers";

export default function RecebimentoOffline() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [offlineEntries, setOfflineEntries] = useState<ReceivingEntry[]>(getOfflineEntries);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("Conexão restaurada!"); };
    const handleOffline = () => { setIsOnline(false); toast.warning("Sem conexão — modo offline ativo"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch pending orders
  const fetchOrders = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select(`
          id, numero, valor_total, status, data_previsao,
          fornecedor:fornecedores(razao_social),
          pedido_itens(id, descricao, quantidade, quantidade_recebida, unidade, valor_unitario)
        `)
        .in("status", ["aprovado", "enviado", "em_transito", "parcial"])
        .order("data_previsao", { ascending: true });

      if (error) throw error;

      const mapped: PendingOrder[] = (pedidos || []).map((p: any) => ({
        id: p.id,
        numero: p.numero,
        fornecedor_nome: p.fornecedor?.razao_social || "Fornecedor",
        data_previsao: p.data_previsao,
        valor_total: p.valor_total || 0,
        status: p.status,
        itens: (p.pedido_itens || []).map((i: any) => ({
          id: i.id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          quantidade_recebida: i.quantidade_recebida,
          unidade: i.unidade,
          valor_unitario: i.valor_unitario,
        })),
      }));

      setOrders(mapped);
      // Cache for offline use
      localStorage.setItem("offline-orders-cache", JSON.stringify(mapped));
    } catch (err: unknown) {
      // Try cached data
      const cached = localStorage.getItem("offline-orders-cache");
      if (cached) {
        setOrders(JSON.parse(cached));
        toast.info("Usando dados em cache");
      } else {
        toast.error("Erro ao buscar pedidos");
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // On mount, load cached orders if offline
  useEffect(() => {
    if (!isOnline) {
      const cached = localStorage.getItem("offline-orders-cache");
      if (cached) {
        setOrders(JSON.parse(cached));
        setLoading(false);
      }
    }
  }, [isOnline]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.numero.toLowerCase().includes(q) || o.fornecedor_nome.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const selectOrder = (order: PendingOrder) => {
    setSelectedOrder(order);
    const initial: Record<string, number> = {};
    const notes: Record<string, string> = {};
    order.itens.forEach(item => {
      initial[item.id] = item.quantidade_recebida || 0;
      notes[item.id] = "";
    });
    setReceivedQty(initial);
    setItemNotes(notes);
    setGeneralNote("");
  };

  const totalOrdered = selectedOrder?.itens.reduce((s, i) => s + i.quantidade, 0) || 0;
  const totalReceived = Object.values(receivedQty).reduce((s, q) => s + q, 0);
  const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  const isComplete = selectedOrder?.itens.every(i => (receivedQty[i.id] || 0) >= i.quantidade) || false;

  const handleSave = useCallback(async () => {
    if (!selectedOrder) return;
    setSaving(true);

    const entry: ReceivingEntry = {
      pedido_id: selectedOrder.id,
      pedido_numero: selectedOrder.numero,
      items: selectedOrder.itens.map(item => ({
        item_id: item.id,
        quantidade_recebida: receivedQty[item.id] || 0,
        observacao: itemNotes[item.id] || "",
      })),
      observacao_geral: generalNote,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    if (isOnline) {
      try {
        for (const item of entry.items) {
          await supabase
            .from("pedido_itens")
            .update({ quantidade_recebida: item.quantidade_recebida })
            .eq("id", item.item_id);
        }

        const newStatus = isComplete ? "entregue" : totalReceived > 0 ? "parcial" : undefined;
        if (newStatus) {
          await supabase.from("pedidos").update({
            status: newStatus,
            ...(isComplete ? { data_entrega: new Date().toISOString().split("T")[0] } : {}),
          }).eq("id", selectedOrder.id);
        }

        entry.synced = true;
        toast.success(isComplete ? "Recebimento completo registrado!" : "Recebimento parcial registrado!");
        setSelectedOrder(null);
        fetchOrders();
      } catch (err: unknown) {
        // Save offline if sync fails
        const entries = [...offlineEntries, entry];
        saveOfflineEntries(entries);
        setOfflineEntries(entries);
        toast.warning("Salvo localmente — sincronizará quando a conexão retornar");
      }
    } else {
      const entries = [...offlineEntries, entry];
      saveOfflineEntries(entries);
      setOfflineEntries(entries);
      toast.info("Recebimento salvo offline — sincronizará automaticamente");
      setSelectedOrder(null);
    }

    setSaving(false);
  }, [selectedOrder, receivedQty, itemNotes, generalNote, isOnline, isComplete, totalReceived, offlineEntries, fetchOrders]);

  // Auto-sync when coming back online
  const syncOfflineEntries = useCallback(async () => {
    const unsynced = offlineEntries.filter(e => !e.synced);
    if (unsynced.length === 0 || !isOnline) return;

    setSyncing(true);
    let syncedCount = 0;

    for (const entry of unsynced) {
      try {
        for (const item of entry.items) {
          await supabase
            .from("pedido_itens")
            .update({ quantidade_recebida: item.quantidade_recebida })
            .eq("id", item.item_id);
        }

        const allComplete = entry.items.every(i => i.quantidade_recebida > 0);
        const newStatus = allComplete ? "entregue" : "parcial";
        await supabase.from("pedidos").update({ status: newStatus }).eq("id", entry.pedido_id);

        entry.synced = true;
        syncedCount++;
      } catch {
        // Will retry next time
      }
    }

    saveOfflineEntries(offlineEntries);
    setOfflineEntries([...offlineEntries]);

    if (syncedCount > 0) {
      toast.success(`${syncedCount} recebimento(s) sincronizado(s)!`);
      fetchOrders();
    }
    setSyncing(false);
  }, [offlineEntries, isOnline, fetchOrders]);

  useEffect(() => {
    if (isOnline && offlineEntries.some(e => !e.synced)) {
      syncOfflineEntries();
    }
  }, [isOnline, syncOfflineEntries, offlineEntries]);

  const unsyncedCount = offlineEntries.filter(e => !e.synced).length;

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        {/* Offline Banner */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border transition-colors",
          isOnline ? "bg-success/5 border-success/20" : "bg-warning/10 border-warning/30"
        )}>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-warning" />}
            <span className="text-sm font-medium">
              {isOnline ? "Online — dados sincronizados" : "Offline — salvando localmente"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unsyncedCount > 0 && (
              <Badge variant="outline" className="text-warning border-warning/30">
                {unsyncedCount} pendente{unsyncedCount > 1 ? "s" : ""}
              </Badge>
            )}
            {isOnline && unsyncedCount > 0 && (
              <Button size="sm" variant="outline" onClick={syncOfflineEntries} disabled={syncing}>
                {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span className="ml-1">Sincronizar</span>
              </Button>
            )}
          </div>
        </div>

        <PageHeader
          title="Recebimento de Materiais"
          description="Conferência de entregas — funciona offline"
          icon={ClipboardCheck}
        />

        {/* Order Selection View */}
        {!selectedOrder ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido por número ou fornecedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum pedido pendente de recebimento</p>
                <p className="text-sm mt-1">Todos os pedidos foram recebidos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map(order => {
                  const itemsTotal = order.itens.reduce((s, i) => s + i.quantidade, 0);
                  const itemsReceived = order.itens.reduce((s, i) => s + (i.quantidade_recebida || 0), 0);
                  const orderProgress = itemsTotal > 0 ? (itemsReceived / itemsTotal) * 100 : 0;

                  return (
                    <Card
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => selectOrder(order)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold">{order.numero}</span>
                              <Badge variant="outline" className="text-xs">
                                {order.status === "parcial" ? "Receb. Parcial" : "Aguardando"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> {order.fornecedor_nome}
                              </span>
                              {order.data_previsao && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(order.data_previsao), "dd/MM/yyyy")}
                                </span>
                              )}
                            </div>
                            {orderProgress > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <Progress value={orderProgress} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground">{Math.round(orderProgress)}%</span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <ReceivingFormView
            order={selectedOrder}
            receivedQty={receivedQty}
            itemNotes={itemNotes}
            generalNote={generalNote}
            saving={saving}
            isOnline={isOnline}
            onBack={() => setSelectedOrder(null)}
            onSetReceivedQty={setReceivedQty}
            onSetItemNotes={setItemNotes}
            onSetGeneralNote={setGeneralNote}
            onSave={handleSave}
            totalOrdered={totalOrdered}
            totalReceived={totalReceived}
            progress={progress}
          />
        )}
      </div>
    </MainLayout>
  );
}
