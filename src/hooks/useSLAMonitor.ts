import { useEffect, useCallback, useRef } from 'react';
import { useNotifications } from './useNotifications';
import { solicitacoesMock, Solicitacao } from '@/data/mockData';

interface SLAConfig {
  warningThresholdDays: number;  // Days before deadline to warn
  criticalThresholdDays: number; // Days before deadline for critical
  checkIntervalMs: number;       // How often to check (ms)
}

const DEFAULT_CONFIG: SLAConfig = {
  warningThresholdDays: 3,
  criticalThresholdDays: 1,
  checkIntervalMs: 60000 // Check every minute
};

// Parse prazo string to days (e.g., "15-20 dias" -> 15)
const parsePrazoToDays = (prazo: string): number => {
  const match = prazo.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 14;
};

// Calculate SLA status based on order data
const calculateSLAStatus = (
  solicitacao: Solicitacao,
  config: SLAConfig
): 'ok' | 'warning' | 'critical' | 'overdue' | null => {
  // Only check orders in active statuses
  const activeStatuses = ['em_cotacao', 'aguardando_aprovacao', 'aprovado', 'em_producao'];
  if (!activeStatuses.includes(solicitacao.status)) {
    return null;
  }

  // Simulate a delivery deadline based on prazo
  const prazoDays = parsePrazoToDays(solicitacao.prazoEntrega);
  
  // For mock: simulate deadline as created date + prazo days
  // In real app, this would come from actual order data
  const mockCreatedDate = new Date();
  mockCreatedDate.setDate(mockCreatedDate.getDate() - Math.floor(Math.random() * 10));
  
  const deadline = new Date(mockCreatedDate);
  deadline.setDate(deadline.getDate() + prazoDays);
  
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline < 0) {
    return 'overdue';
  } else if (daysUntilDeadline <= config.criticalThresholdDays) {
    return 'critical';
  } else if (daysUntilDeadline <= config.warningThresholdDays) {
    return 'warning';
  }
  
  return 'ok';
};

export const useSLAMonitor = (config: Partial<SLAConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { sendNotification } = useNotifications();
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

  const checkSLA = useCallback(async () => {
    console.log('🔍 Verificando SLA dos pedidos...');
    
    for (const solicitacao of solicitacoesMock) {
      const status = calculateSLAStatus(solicitacao, finalConfig);
      
      if (!status || status === 'ok') continue;
      
      // Create unique key to avoid duplicate notifications
      const notificationKey = `${solicitacao.id}-${status}`;
      
      if (notifiedOrdersRef.current.has(notificationKey)) continue;
      
      // Generate appropriate message
      let message = '';
      switch (status) {
        case 'warning':
          message = `Prazo de entrega se aproximando (${solicitacao.prazoEntrega})`;
          break;
        case 'critical':
          message = `URGENTE: Prazo de entrega muito próximo (${solicitacao.prazoEntrega})`;
          break;
        case 'overdue':
          message = `ATRASADO: Prazo de entrega expirado (${solicitacao.prazoEntrega})`;
          break;
      }
      
      await sendNotification(
        solicitacao.id,
        solicitacao.itemNumber,
        status,
        message
      );
      
      notifiedOrdersRef.current.add(notificationKey);
    }
  }, [finalConfig, sendNotification]);

  // Manual trigger for testing
  const triggerTestNotification = useCallback(async () => {
    const testSolicitacao = solicitacoesMock[0];
    if (testSolicitacao) {
      await sendNotification(
        testSolicitacao.id,
        testSolicitacao.itemNumber,
        'warning',
        `[TESTE] Prazo de entrega se aproximando (${testSolicitacao.prazoEntrega})`
      );
    }
  }, [sendNotification]);

  // Start monitoring
  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkSLA, 2000);
    
    // Periodic checks
    const interval = setInterval(checkSLA, finalConfig.checkIntervalMs);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkSLA, finalConfig.checkIntervalMs]);

  return {
    checkSLA,
    triggerTestNotification
  };
};
