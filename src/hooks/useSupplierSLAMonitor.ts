import { useEffect, useCallback, useRef, useState } from 'react';
import { useNotifications } from './useNotifications';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { toast } from 'sonner';

interface SupplierSLAData {
  id: string;
  name: string;
  slaCompliance: number;
  onTimeDelivery: number;
  totalOrders: number;
  criticalOrders: number;
  overdueOrders: number;
}

// Generate mock supplier SLA data
const generateSupplierSLAData = (): SupplierSLAData[] => {
  const suppliers = [
    { id: 'xbz', name: 'XBZ Brindes' },
    { id: 'tech', name: 'Tech Brindes' },
    { id: 'stricker', name: 'Stricker / Spot Gifts' },
    { id: 'premium', name: 'Premium Gifts' },
    { id: 'asia', name: 'Asia Import' },
    { id: 'eco', name: 'Eco Brindes' },
  ];

  return suppliers.map((supplier) => {
    // Simulate some suppliers performing below threshold
    const isUnderperforming = Math.random() > 0.7;
    const baseCompliance = isUnderperforming ? 70 + Math.random() * 15 : 85 + Math.random() * 14;
    
    return {
      id: supplier.id,
      name: supplier.name,
      slaCompliance: Math.round(baseCompliance * 10) / 10,
      onTimeDelivery: Math.round((baseCompliance + Math.random() * 5) * 10) / 10,
      totalOrders: Math.floor(20 + Math.random() * 40),
      criticalOrders: isUnderperforming ? Math.floor(2 + Math.random() * 4) : Math.floor(Math.random() * 2),
      overdueOrders: isUnderperforming ? Math.floor(1 + Math.random() * 3) : Math.floor(Math.random() * 2),
    };
  });
};

export interface SupplierAlert {
  id: string;
  supplierId: string;
  supplierName: string;
  type: 'warning' | 'critical';
  slaCompliance: number;
  threshold: number;
  message: string;
  createdAt: Date;
}

export const useSupplierSLAMonitor = () => {
  const { settings } = useSLASettings();
  const { sendNotification } = useNotifications();
  const [supplierAlerts, setSupplierAlerts] = useState<SupplierAlert[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierSLAData[]>([]);
  const notifiedSuppliersRef = useRef<Set<string>>(new Set());

  const checkSupplierSLA = useCallback(() => {
    if (!settings.enableSupplierAlerts) return;

    console.log('🏭 Verificando SLA dos fornecedores...');
    
    // Generate fresh mock data
    const currentData = generateSupplierSLAData();
    setSupplierData(currentData);

    const newAlerts: SupplierAlert[] = [];

    currentData.forEach((supplier) => {
      // Get custom threshold or use global
      const supplierConfig = settings.supplierAlertConfigs.find(
        (c) => c.supplierId === supplier.id
      );
      
      // Skip if supplier alerts are disabled for this specific supplier
      if (supplierConfig && !supplierConfig.enabled) return;

      const threshold = supplierConfig?.customThreshold ?? settings.supplierSLAThreshold;
      
      // Check if supplier is below threshold
      if (supplier.slaCompliance < threshold) {
        const alertKey = `${supplier.id}-${supplier.slaCompliance < threshold - 10 ? 'critical' : 'warning'}`;
        
        // Avoid duplicate alerts in same session
        if (notifiedSuppliersRef.current.has(alertKey)) return;

        const isCritical = supplier.slaCompliance < threshold - 10;
        const alertType = isCritical ? 'critical' : 'warning';
        
        const alert: SupplierAlert = {
          id: `${supplier.id}-${Date.now()}`,
          supplierId: supplier.id,
          supplierName: supplier.name,
          type: alertType,
          slaCompliance: supplier.slaCompliance,
          threshold,
          message: isCritical
            ? `CRÍTICO: ${supplier.name} com SLA em ${supplier.slaCompliance}% (mínimo: ${threshold}%)`
            : `ATENÇÃO: ${supplier.name} abaixo do threshold de SLA (${supplier.slaCompliance}% < ${threshold}%)`,
          createdAt: new Date(),
        };

        newAlerts.push(alert);
        notifiedSuppliersRef.current.add(alertKey);

        // Send notification
        sendNotification(
          supplier.id,
          supplier.name,
          alertType,
          alert.message
        );

        // Log mock email
        console.log('📧 [MOCK EMAIL] Alerta de fornecedor:', {
          to: settings.emailRecipients,
          subject: `[${alertType.toUpperCase()}] Alerta SLA - ${supplier.name}`,
          body: alert.message,
        });
      }
    });

    if (newAlerts.length > 0) {
      setSupplierAlerts((prev) => [...newAlerts, ...prev]);
    }
  }, [settings, sendNotification]);

  // Trigger test alert
  const triggerTestSupplierAlert = useCallback(() => {
    const testSupplier = {
      id: 'test',
      name: 'Fornecedor Teste',
      slaCompliance: 78,
      threshold: settings.supplierSLAThreshold,
    };

    const alert: SupplierAlert = {
      id: `test-${Date.now()}`,
      supplierId: testSupplier.id,
      supplierName: testSupplier.name,
      type: 'warning',
      slaCompliance: testSupplier.slaCompliance,
      threshold: testSupplier.threshold,
      message: `[TESTE] ${testSupplier.name} abaixo do threshold de SLA (${testSupplier.slaCompliance}% < ${testSupplier.threshold}%)`,
      createdAt: new Date(),
    };

    setSupplierAlerts((prev) => [alert, ...prev]);
    
    sendNotification(
      testSupplier.id,
      testSupplier.name,
      'warning',
      alert.message
    );

    toast.info('Alerta de teste de fornecedor enviado');
  }, [settings.supplierSLAThreshold, sendNotification]);

  // Clear alerts
  const clearSupplierAlerts = useCallback(() => {
    setSupplierAlerts([]);
    notifiedSuppliersRef.current.clear();
  }, []);

  // Periodic check
  useEffect(() => {
    if (!settings.enableSupplierAlerts) return;

    // Initial check
    const initialTimeout = setTimeout(checkSupplierSLA, 3000);
    
    // Periodic checks (every 5 minutes for supplier SLA)
    const interval = setInterval(checkSupplierSLA, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkSupplierSLA, settings.enableSupplierAlerts]);

  return {
    supplierAlerts,
    supplierData,
    checkSupplierSLA,
    triggerTestSupplierAlert,
    clearSupplierAlerts,
  };
};
