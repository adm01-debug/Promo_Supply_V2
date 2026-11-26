import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface KPITarget {
  id: string;
  name: string;
  target: number;
  warningThreshold: number; // % below target to trigger warning
  criticalThreshold: number; // % below target to trigger critical
  unit: string;
  enabled: boolean;
}

export interface KPIAlert {
  id: string;
  kpiId: string;
  kpiName: string;
  type: 'warning' | 'critical' | 'success';
  message: string;
  currentValue: number;
  targetValue: number;
  timestamp: Date;
  read: boolean;
}

interface KPITargetsState {
  targets: KPITarget[];
  alerts: KPIAlert[];
  updateTarget: (id: string, updates: Partial<KPITarget>) => void;
  addAlert: (alert: Omit<KPIAlert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  clearAlerts: () => void;
  getUnreadCount: () => number;
}

const defaultTargets: KPITarget[] = [
  {
    id: 'procurement_roi',
    name: 'ROI Procurement',
    target: 5.0,
    warningThreshold: 20,
    criticalThreshold: 40,
    unit: 'x',
    enabled: true
  },
  {
    id: 'maverick_spend',
    name: 'Maverick Spend',
    target: 10,
    warningThreshold: 30,
    criticalThreshold: 50,
    unit: '%',
    enabled: true
  },
  {
    id: 'contract_compliance',
    name: 'Contract Compliance',
    target: 90,
    warningThreshold: 10,
    criticalThreshold: 20,
    unit: '%',
    enabled: true
  },
  {
    id: 'cost_avoidance',
    name: 'Cost Avoidance',
    target: 150000,
    warningThreshold: 20,
    criticalThreshold: 40,
    unit: 'R$',
    enabled: true
  },
  {
    id: 'po_cycle_time',
    name: 'PO Cycle Time',
    target: 2.0,
    warningThreshold: 30,
    criticalThreshold: 60,
    unit: 'dias',
    enabled: true
  },
  {
    id: 'supplier_concentration',
    name: 'Concentração Top 5',
    target: 60,
    warningThreshold: 15,
    criticalThreshold: 30,
    unit: '%',
    enabled: true
  },
  {
    id: 'first_time_match',
    name: 'First-Time Match Rate',
    target: 95,
    warningThreshold: 10,
    criticalThreshold: 20,
    unit: '%',
    enabled: true
  },
  {
    id: 'savings_realization',
    name: 'Savings Realization',
    target: 80,
    warningThreshold: 15,
    criticalThreshold: 30,
    unit: '%',
    enabled: true
  }
];

export const useKPITargetsStore = create<KPITargetsState>()(
  persist(
    (set, get) => ({
      targets: defaultTargets,
      alerts: [],
      
      updateTarget: (id, updates) => {
        set(state => ({
          targets: state.targets.map(t => 
            t.id === id ? { ...t, ...updates } : t
          )
        }));
      },
      
      addAlert: (alert) => {
        const newAlert: KPIAlert = {
          ...alert,
          id: `${alert.kpiId}-${Date.now()}`,
          timestamp: new Date(),
          read: false
        };
        set(state => ({
          alerts: [newAlert, ...state.alerts].slice(0, 50) // Keep last 50 alerts
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
      
      getUnreadCount: () => {
        return get().alerts.filter(a => !a.read).length;
      }
    }),
    {
      name: 'kpi-targets-storage'
    }
  )
);

// Helper function to check KPI against target and generate alert
export const checkKPIStatus = (
  kpiId: string,
  currentValue: number,
  target: KPITarget,
  isInverse: boolean = false // For KPIs where lower is better (like maverick spend, cycle time)
): { status: 'success' | 'warning' | 'critical'; percentage: number } => {
  if (!target.enabled) {
    return { status: 'success', percentage: 100 };
  }

  let percentage: number;
  
  if (isInverse) {
    // For inverse KPIs (lower is better), being above target is bad
    if (currentValue <= target.target) {
      percentage = 100;
    } else {
      percentage = (target.target / currentValue) * 100;
    }
  } else {
    // For normal KPIs (higher is better)
    percentage = (currentValue / target.target) * 100;
  }

  const deviation = 100 - percentage;

  if (deviation >= target.criticalThreshold) {
    return { status: 'critical', percentage };
  }
  if (deviation >= target.warningThreshold) {
    return { status: 'warning', percentage };
  }
  return { status: 'success', percentage };
};
