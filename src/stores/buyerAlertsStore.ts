import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BuyerTarget {
  buyerId: string;
  buyerName: string;
  economiaMensal: number;
  descontoMedio: number;
  cotacoesMinimas: number;
  warningThreshold: number; // % below target to trigger warning
  criticalThreshold: number; // % below target to trigger critical
  enabled: boolean;
}

export interface BuyerAlert {
  id: string;
  buyerId: string;
  buyerName: string;
  metric: 'economia' | 'desconto' | 'cotacoes';
  metricLabel: string;
  type: 'warning' | 'critical' | 'success';
  message: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  timestamp: Date;
  read: boolean;
}

interface BuyerAlertsState {
  targets: BuyerTarget[];
  alerts: BuyerAlert[];
  updateTarget: (buyerId: string, updates: Partial<BuyerTarget>) => void;
  setTargets: (targets: BuyerTarget[]) => void;
  addAlert: (alert: Omit<BuyerAlert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  clearAlerts: () => void;
  clearBuyerAlerts: (buyerId: string) => void;
  getUnreadCount: () => number;
  getAlertsByBuyer: (buyerId: string) => BuyerAlert[];
}

const defaultTargets: BuyerTarget[] = [
  {
    buyerId: 'ana-silva',
    buyerName: 'Ana Silva',
    economiaMensal: 10000,
    descontoMedio: 12,
    cotacoesMinimas: 40,
    warningThreshold: 15,
    criticalThreshold: 30,
    enabled: true
  },
  {
    buyerId: 'carlos-souza',
    buyerName: 'Carlos Souza',
    economiaMensal: 8000,
    descontoMedio: 10,
    cotacoesMinimas: 35,
    warningThreshold: 15,
    criticalThreshold: 30,
    enabled: true
  },
  {
    buyerId: 'maria-santos',
    buyerName: 'Maria Santos',
    economiaMensal: 6000,
    descontoMedio: 8,
    cotacoesMinimas: 30,
    warningThreshold: 15,
    criticalThreshold: 30,
    enabled: true
  },
  {
    buyerId: 'pedro-lima',
    buyerName: 'Pedro Lima',
    economiaMensal: 7000,
    descontoMedio: 9,
    cotacoesMinimas: 32,
    warningThreshold: 15,
    criticalThreshold: 30,
    enabled: true
  }
];

export const useBuyerAlertsStore = create<BuyerAlertsState>()(
  persist(
    (set, get) => ({
      targets: defaultTargets,
      alerts: [],
      
      updateTarget: (buyerId, updates) => {
        set(state => ({
          targets: state.targets.map(t => 
            t.buyerId === buyerId ? { ...t, ...updates } : t
          )
        }));
      },

      setTargets: (targets) => {
        set({ targets });
      },
      
      addAlert: (alert) => {
        const existingAlerts = get().alerts;
        // Prevent duplicate alerts for same buyer/metric within 1 hour
        const recentDuplicate = existingAlerts.find(a => 
          a.buyerId === alert.buyerId && 
          a.metric === alert.metric &&
          a.type === alert.type &&
          (new Date().getTime() - new Date(a.timestamp).getTime()) < 3600000
        );
        
        if (recentDuplicate) return;

        const newAlert: BuyerAlert = {
          ...alert,
          id: `${alert.buyerId}-${alert.metric}-${Date.now()}`,
          timestamp: new Date(),
          read: false
        };
        set(state => ({
          alerts: [newAlert, ...state.alerts].slice(0, 100) // Keep last 100 alerts
        }));
      },
      
      markAlertAsRead: (id) => {
        set(state => ({
          alerts: state.alerts.map(a => 
            a.id === id ? { ...a, read: true } : a
          )
        }));
      },
      
      markAllAlertsAsRead: () => {
        set(state => ({
          alerts: state.alerts.map(a => ({ ...a, read: true }))
        }));
      },
      
      clearAlerts: () => {
        set({ alerts: [] });
      },

      clearBuyerAlerts: (buyerId) => {
        set(state => ({
          alerts: state.alerts.filter(a => a.buyerId !== buyerId)
        }));
      },
      
      getUnreadCount: () => {
        return get().alerts.filter(a => !a.read).length;
      },

      getAlertsByBuyer: (buyerId) => {
        return get().alerts.filter(a => a.buyerId === buyerId);
      }
    }),
    {
      name: 'buyer-alerts-storage'
    }
  )
);

// Helper function to check buyer performance and generate alerts
export const checkBuyerPerformance = (
  buyerId: string,
  buyerName: string,
  currentValue: number,
  targetValue: number,
  metric: 'economia' | 'desconto' | 'cotacoes',
  target: BuyerTarget
): { status: 'success' | 'warning' | 'critical'; percentage: number; shouldAlert: boolean } => {
  if (!target.enabled) {
    return { status: 'success', percentage: 100, shouldAlert: false };
  }

  const percentage = (currentValue / targetValue) * 100;
  const deviation = 100 - percentage;

  if (deviation >= target.criticalThreshold) {
    return { status: 'critical', percentage, shouldAlert: true };
  }
  if (deviation >= target.warningThreshold) {
    return { status: 'warning', percentage, shouldAlert: true };
  }
  return { status: 'success', percentage, shouldAlert: false };
};

export const getMetricLabel = (metric: 'economia' | 'desconto' | 'cotacoes'): string => {
  switch (metric) {
    case 'economia': return 'Economia Mensal';
    case 'desconto': return 'Desconto Médio';
    case 'cotacoes': return 'Cotações Realizadas';
  }
};

export const formatMetricValue = (metric: 'economia' | 'desconto' | 'cotacoes', value: number): string => {
  switch (metric) {
    case 'economia': return `R$ ${value.toLocaleString('pt-BR')}`;
    case 'desconto': return `${value.toFixed(1)}%`;
    case 'cotacoes': return value.toString();
  }
};
