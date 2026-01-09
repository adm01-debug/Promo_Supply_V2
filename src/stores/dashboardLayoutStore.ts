import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full';
}

interface DashboardLayoutState {
  widgets: DashboardWidget[];
  setWidgets: (widgets: DashboardWidget[]) => void;
  toggleWidgetVisibility: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resizeWidget: (id: string, size: DashboardWidget['size']) => void;
  resetLayout: () => void;
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'kpi-aguardando', type: 'kpi', title: 'Aguard. Cotação', visible: true, order: 0, size: 'small' },
  { id: 'kpi-volume', type: 'kpi', title: 'Volume Mês', visible: true, order: 1, size: 'small' },
  { id: 'kpi-economia', type: 'kpi', title: 'Economia Gerada', visible: true, order: 2, size: 'small' },
  { id: 'kpi-sla', type: 'kpi', title: 'Taxa SLA', visible: true, order: 3, size: 'small' },
  { id: 'chart-sla', type: 'chart', title: 'Distribuição SLA', visible: true, order: 4, size: 'medium' },
  { id: 'chart-pipeline', type: 'chart', title: 'Pipeline', visible: true, order: 5, size: 'medium' },
  { id: 'supplier-alerts', type: 'panel', title: 'Alertas Fornecedores', visible: true, order: 6, size: 'medium' },
  { id: 'supplier-ranking', type: 'panel', title: 'Ranking Fornecedores', visible: true, order: 7, size: 'medium' },
  { id: 'buyer-performance', type: 'panel', title: 'Performance Comprador', visible: true, order: 8, size: 'medium' },
  { id: 'savings-goal', type: 'panel', title: 'Meta de Economia', visible: true, order: 9, size: 'medium' },
  { id: 'delivery-calendar', type: 'calendar', title: 'Calendário Entregas', visible: true, order: 10, size: 'large' },
  { id: 'urgent-items', type: 'list', title: 'Itens Urgentes', visible: true, order: 11, size: 'medium' },
  { id: 'demand-prediction', type: 'ai', title: 'Previsão de Demanda (IA)', visible: true, order: 12, size: 'large' },
  { id: 'risk-heatmap', type: 'ai', title: 'Análise de Riscos', visible: true, order: 13, size: 'full' },
];

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      
      setWidgets: (widgets) => set({ widgets }),
      
      toggleWidgetVisibility: (id) => set((state) => ({
        widgets: state.widgets.map(w => 
          w.id === id ? { ...w, visible: !w.visible } : w
        )
      })),
      
      reorderWidgets: (fromIndex, toIndex) => set((state) => {
        const widgets = [...state.widgets];
        const [removed] = widgets.splice(fromIndex, 1);
        widgets.splice(toIndex, 0, removed);
        return { widgets: widgets.map((w, i) => ({ ...w, order: i })) };
      }),
      
      resizeWidget: (id, size) => set((state) => ({
        widgets: state.widgets.map(w => 
          w.id === id ? { ...w, size } : w
        )
      })),
      
      resetLayout: () => set({ widgets: defaultWidgets }),
    }),
    {
      name: 'dashboard-layout',
    }
  )
);
