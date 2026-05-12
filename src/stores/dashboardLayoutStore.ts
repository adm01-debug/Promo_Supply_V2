import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

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
  isLoading: boolean;
  setWidgets: (widgets: DashboardWidget[]) => void;
  toggleWidgetVisibility: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resizeWidget: (id: string, size: DashboardWidget['size']) => void;
  resetLayout: () => void;
  loadFromDb: (dashboardId: string) => Promise<void>;
  saveToDb: (dashboardId: string) => Promise<void>;
}

const defaultWidgets: DashboardWidget[] = [
  // ... keep existing defaultWidgets array
  // KPIs (top row)
  { id: 'kpi-aguardando', type: 'kpi', title: 'Aguard. Cotação', visible: true, order: 0, size: 'small' },
  { id: 'kpi-volume', type: 'kpi', title: 'Volume Mês', visible: true, order: 1, size: 'small' },
  { id: 'kpi-economia', type: 'kpi', title: 'Economia Gerada', visible: true, order: 2, size: 'small' },
  { id: 'kpi-sla', type: 'kpi', title: 'Taxa SLA', visible: true, order: 3, size: 'small' },

  // Charts (hierarchy: bigger first)
  { id: 'dashboard-insights', type: 'ai', title: 'Insights de IA', visible: true, order: 4, size: 'full' },
  { id: 'trend-charts', type: 'chart', title: 'Tendências e Distribuição', visible: true, order: 5, size: 'full' },
  { id: 'chart-pipeline', type: 'chart', title: 'Pipeline', visible: true, order: 6, size: 'large' },
  { id: 'chart-sla', type: 'chart', title: 'Distribuição SLA', visible: true, order: 7, size: 'large' },

  // Panels
  { id: 'buyer-performance', type: 'panel', title: 'Performance Comprador', visible: true, order: 8, size: 'large' },
  { id: 'supplier-ranking', type: 'panel', title: 'Ranking Fornecedores', visible: true, order: 9, size: 'medium' },
  { id: 'supplier-alerts', type: 'panel', title: 'Alertas Fornecedores', visible: true, order: 10, size: 'medium' },
  { id: 'savings-goal', type: 'panel', title: 'Meta de Economia', visible: true, order: 11, size: 'medium' },

  // Operational widgets
  { id: 'delivery-calendar', type: 'calendar', title: 'Calendário Entregas', visible: true, order: 12, size: 'full' },
  { id: 'urgent-items', type: 'list', title: 'Itens Urgentes', visible: true, order: 13, size: 'medium' },

  // AI widgets
  { id: 'demand-prediction', type: 'ai', title: 'Previsão de Demanda (IA)', visible: true, order: 14, size: 'large' },
  { id: 'risk-heatmap', type: 'ai', title: 'Análise de Riscos', visible: true, order: 15, size: 'full' },
];

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      isLoading: false,
      
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

      loadFromDb: async (dashboardId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('dashboard_layouts')
            .select('layout')
            .eq('user_id', user.id)
            .eq('dashboard_id', dashboardId)
            .maybeSingle();

          if (error) throw error;
          if (data?.layout) {
            set({ widgets: data.layout as DashboardWidget[] });
          }
        } catch (error) {
          console.error('Error loading dashboard layout:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      saveToDb: async (dashboardId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { widgets } = get();
        try {
          const { error } = await supabase
            .from('dashboard_layouts')
            .upsert({
              user_id: user.id,
              dashboard_id: dashboardId,
              layout: widgets,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, dashboard_id' });

          if (error) throw error;
        } catch (error) {
          console.error('Error saving dashboard layout:', error);
        }
      }
    }),
    {
      name: 'dashboard-layout',
    }
  )
);
