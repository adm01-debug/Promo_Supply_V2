import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Zap,
  Clock,
  Server,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Types
interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: { warning: number; critical: number };
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  description: string;
}

// Web Vitals thresholds (based on Google recommendations)
const webVitalsThresholds = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint
};

// Mock performance data
const mockMetrics: PerformanceMetric[] = [
  {
    id: 'load-time',
    name: 'Tempo de Carregamento',
    value: 1.2,
    unit: 's',
    threshold: { warning: 2, critical: 4 },
    trend: 'down',
    history: [1.8, 1.6, 1.4, 1.3, 1.2],
  },
  {
    id: 'api-latency',
    name: 'Latência da API',
    value: 85,
    unit: 'ms',
    threshold: { warning: 200, critical: 500 },
    trend: 'stable',
    history: [90, 88, 92, 85, 85],
  },
  {
    id: 'memory-usage',
    name: 'Uso de Memória',
    value: 45,
    unit: '%',
    threshold: { warning: 70, critical: 90 },
    trend: 'up',
    history: [38, 40, 42, 44, 45],
  },
  {
    id: 'cache-hit',
    name: 'Taxa de Cache',
    value: 92,
    unit: '%',
    threshold: { warning: 80, critical: 60 },
    trend: 'up',
    history: [85, 87, 89, 91, 92],
  },
];

const mockWebVitals: WebVital[] = [
  { name: 'LCP', value: 1800, rating: 'good', description: 'Largest Contentful Paint' },
  { name: 'FID', value: 45, rating: 'good', description: 'First Input Delay' },
  { name: 'CLS', value: 0.05, rating: 'good', description: 'Cumulative Layout Shift' },
  { name: 'TTFB', value: 650, rating: 'good', description: 'Time to First Byte' },
  { name: 'FCP', value: 1200, rating: 'good', description: 'First Contentful Paint' },
  { name: 'INP', value: 120, rating: 'good', description: 'Interaction to Next Paint' },
];

// Mini Sparkline Component
const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Metric Card Component
const MetricCard = ({ metric }: { metric: PerformanceMetric }) => {
  const getStatus = () => {
    // For cache-hit, higher is better (inverse thresholds)
    if (metric.id === 'cache-hit') {
      if (metric.value >= metric.threshold.warning) return 'good';
      if (metric.value >= metric.threshold.critical) return 'warning';
      return 'critical';
    }
    // For other metrics, lower is better
    if (metric.value <= metric.threshold.warning) return 'good';
    if (metric.value <= metric.threshold.critical) return 'warning';
    return 'critical';
  };

  const status = getStatus();
  const statusConfig = {
    good: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle },
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("p-3 rounded-lg border", config.bg, `border-${status === 'good' ? 'emerald' : status === 'warning' ? 'amber' : 'red'}-500/30`)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{metric.name}</span>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{metric.value}</span>
          <span className="text-xs text-muted-foreground">{metric.unit}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <MiniSparkline data={metric.history} color={config.color === 'text-emerald-500' ? '#10b981' : config.color === 'text-amber-500' ? '#f59e0b' : '#ef4444'} />
          {metric.trend === 'up' ? (
            <TrendingUp className={cn("w-3 h-3", metric.id === 'cache-hit' ? 'text-emerald-500' : 'text-red-500')} />
          ) : metric.trend === 'down' ? (
            <TrendingDown className={cn("w-3 h-3", metric.id === 'cache-hit' ? 'text-red-500' : 'text-emerald-500')} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Web Vital Badge Component
const WebVitalBadge = ({ vital }: { vital: WebVital }) => {
  const ratingConfig = {
    good: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    'needs-improvement': { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    poor: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };

  const config = ratingConfig[vital.rating];
  const formatValue = () => {
    if (vital.name === 'CLS') return vital.value.toFixed(2);
    if (vital.value >= 1000) return `${(vital.value / 1000).toFixed(1)}s`;
    return `${vital.value}ms`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-help",
          config.bg, config.border
        )}>
          <span className="text-xs font-medium">{vital.name}</span>
          <span className={cn("text-sm font-bold", config.color)}>{formatValue()}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{vital.description}</p>
        <p className="text-xs text-muted-foreground">
          {vital.rating === 'good' ? 'Bom' : vital.rating === 'needs-improvement' ? 'Precisa melhorar' : 'Ruim'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

// Connection Status Component
const ConnectionStatus = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection type if available
    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg",
      online ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
    )}>
      <Wifi className="w-4 h-4" />
      <span className="text-xs font-medium">
        {online ? `Online (${connectionType.toUpperCase()})` : 'Offline'}
      </span>
    </div>
  );
};

// Main Performance Monitor Component
export const PerformanceMonitor = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const overallScore = useMemo(() => {
    const goodVitals = mockWebVitals.filter(v => v.rating === 'good').length;
    return Math.round((goodVitals / mockWebVitals.length) * 100);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In real implementation, refetch metrics here
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  overallScore >= 80 ? "bg-emerald-500/10" : overallScore >= 60 ? "bg-amber-500/10" : "bg-red-500/10"
                )}>
                  <Activity className={cn(
                    "w-5 h-5",
                    overallScore >= 80 ? "text-emerald-500" : overallScore >= 60 ? "text-amber-500" : "text-red-500"
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold">Performance</h3>
                  <p className="text-xs text-muted-foreground">
                    Score: {overallScore}% • Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ConnectionStatus />
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            {/* Web Vitals */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Zap className="w-4 h-4 text-primary" />
                  Core Web Vitals
                </h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Métricas de experiência do usuário definidas pelo Google</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-2">
                {mockWebVitals.map(vital => (
                  <WebVitalBadge key={vital.name} vital={vital} />
                ))}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mockMetrics.map(metric => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
                    Auto-refresh (30s)
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastUpdate(new Date())}
                  className="gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Atualizar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="gap-1"
                >
                  {showDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showDetails ? 'Ocultar' : 'Detalhes'}
                </Button>
              </div>
            </div>

            {/* Extended Details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <span>Servidor: São Paulo (GRU)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span>DB Pool: 8/20 conexões</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Uptime: 99.98%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span>Requests: 1.2k/min</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// Compact Widget for Header/Footer
export const PerformanceWidget = () => {
  const overallScore = useMemo(() => {
    const goodVitals = mockWebVitals.filter(v => v.rating === 'good').length;
    return Math.round((goodVitals / mockWebVitals.length) * 100);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer",
          overallScore >= 80 ? "bg-emerald-500/10 text-emerald-500" : 
          overallScore >= 60 ? "bg-amber-500/10 text-amber-500" : 
          "bg-red-500/10 text-red-500"
        )}>
          <Activity className="w-3 h-3" />
          <span className="text-xs font-medium">{overallScore}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Performance Score: {overallScore}%</p>
        <p className="text-xs text-muted-foreground">Clique para ver detalhes</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default PerformanceMonitor;
