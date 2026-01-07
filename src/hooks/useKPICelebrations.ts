import { useEffect, useRef, useCallback } from 'react';
import { useTriggerCelebration } from '@/components/ui/celebration';

interface KPIMetrics {
  savings: { value: number; target: number };
  contractCompliance: { value: number; target: number };
  avgCycleTime: { value: number; target: number };
  totalSpend: { value: number; target: number };
}

interface AchievementState {
  savings: boolean;
  compliance: boolean;
  cycleTime: boolean;
  underBudget: boolean;
}

const STORAGE_KEY = 'kpi-celebrations-achieved';

export const useKPICelebrations = (metrics: KPIMetrics) => {
  const { celebrateSuccess, celebrateAchievement, celebrateMilestone } = useTriggerCelebration();
  const hasTriggeredRef = useRef<AchievementState>({
    savings: false,
    compliance: false,
    cycleTime: false,
    underBudget: false
  });
  const isInitialMount = useRef(true);

  // Load previously achieved celebrations from session
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        hasTriggeredRef.current = JSON.parse(stored);
      } catch {
        // Invalid stored data, reset
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save achievements to session
  const saveAchievements = useCallback((state: AchievementState) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  useEffect(() => {
    // Skip initial mount to prevent celebrations on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const { savings, contractCompliance, avgCycleTime, totalSpend } = metrics;

    // Check savings goal
    if (savings.value >= savings.target && !hasTriggeredRef.current.savings) {
      hasTriggeredRef.current.savings = true;
      saveAchievements(hasTriggeredRef.current);
      
      const percentage = ((savings.value / savings.target) * 100).toFixed(0);
      celebrateAchievement(
        '🎯 Meta de Savings Atingida!',
        `Economia de R$ ${(savings.value / 1000).toFixed(0)}k - ${percentage}% da meta!`
      );
    }

    // Check compliance goal
    if (contractCompliance.value >= contractCompliance.target && !hasTriggeredRef.current.compliance) {
      hasTriggeredRef.current.compliance = true;
      saveAchievements(hasTriggeredRef.current);
      
      celebrateMilestone(
        '✅ Compliance Atingido!',
        `${contractCompliance.value.toFixed(1)}% de conformidade contratual`
      );
    }

    // Check cycle time goal (lower is better)
    if (avgCycleTime.value <= avgCycleTime.target && !hasTriggeredRef.current.cycleTime) {
      hasTriggeredRef.current.cycleTime = true;
      saveAchievements(hasTriggeredRef.current);
      
      celebrateSuccess(
        '⚡ Tempo de Ciclo Otimizado!',
        `Média de ${avgCycleTime.value} dias - abaixo da meta de ${avgCycleTime.target} dias`
      );
    }

    // Check if under budget
    if (totalSpend.value <= totalSpend.target && !hasTriggeredRef.current.underBudget) {
      hasTriggeredRef.current.underBudget = true;
      saveAchievements(hasTriggeredRef.current);
      
      const saved = totalSpend.target - totalSpend.value;
      celebrateSuccess(
        '💰 Orçamento sob Controle!',
        `R$ ${(saved / 1000).toFixed(0)}k abaixo do orçamento planejado`
      );
    }
  }, [metrics, celebrateSuccess, celebrateAchievement, celebrateMilestone, saveAchievements]);

  // Reset celebrations (can be called when period changes)
  const resetCelebrations = useCallback(() => {
    hasTriggeredRef.current = {
      savings: false,
      compliance: false,
      cycleTime: false,
      underBudget: false
    };
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { resetCelebrations };
};
