import { useState } from "react";
import { 
  BarChart3, 
  AlertTriangle, 
  TrendingUp,
  Award,
  Shield,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierScorecard } from "@/components/compras/SupplierScorecard";
import { RiskHeatMap } from "@/components/compras/RiskHeatMap";
import { SupplierRankingPanel } from "@/components/compras/SupplierRankingPanel";
import { SupplierAlertsPanel } from "@/components/compras/SupplierAlertsPanel";

const SupplierPerformance = () => {
  const [activeTab, setActiveTab] = useState("scorecard");

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" />
              Performance de Fornecedores
            </h1>
            <p className="text-muted-foreground mt-1">
              Scorecard, análise de riscos e métricas de desempenho
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto p-1">
            <TabsTrigger value="scorecard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Scorecard</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Risk Map</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Alertas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scorecard" className="mt-6">
            <SupplierScorecard />
          </TabsContent>

          <TabsContent value="heatmap" className="mt-6">
            <RiskHeatMap />
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <SupplierRankingPanel />
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <SupplierAlertsPanel />
          </TabsContent>
        </Tabs>
      </div>
    
  );
};

export default SupplierPerformance;
