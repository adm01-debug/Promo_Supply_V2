import { useState } from "react";
import { 
  BarChart3, 
  AlertTriangle, 
  TrendingUp,
  Award,
  Shield,
  Users,
  Network,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierScorecard } from "@/components/compras/SupplierScorecard";
import { RiskHeatMap } from "@/components/compras/RiskHeatMap";
import { SupplierRankingPanel } from "@/components/compras/SupplierRankingPanel";
import { SupplierAlertsPanel } from "@/components/compras/SupplierAlertsPanel";
import { ElitePageWrapper } from "@/components/organisms/ElitePageWrapper";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const SupplierPerformance = () => {
  const [activeTab, setActiveTab] = useState("scorecard");

  return (
    <ElitePageWrapper>
      <div className="space-y-10 pb-20">
        {/* Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-sky-500/10 rounded-[2rem] flex items-center justify-center text-sky-400 shadow-inner border border-sky-500/10">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Intelligence Hub
              </h1>
              <div className="flex items-center gap-3 mt-3">
                 <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-sky-500/30 text-sky-400 px-3 py-1">Advanced Performance Analytics</Badge>
                 <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest opacity-50">• Neural Network Monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Elite Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-16 p-1.5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] backdrop-blur-3xl">
            <TabsTrigger value="scorecard" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white/[0.05] data-[state=active]:text-emerald-400 transition-all">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Scorecard</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white/[0.05] data-[state=active]:text-amber-400 transition-all">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Risk Map</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white/[0.05] data-[state=active]:text-sky-400 transition-all">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Rankings</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white/[0.05] data-[state=active]:text-rose-400 transition-all">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Surveillance</span>
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="mt-10"
            >
              <TabsContent value="scorecard" className="mt-0 focus-visible:ring-0">
                <SupplierScorecard />
              </TabsContent>

              <TabsContent value="heatmap" className="mt-0 focus-visible:ring-0">
                <RiskHeatMap />
              </TabsContent>

              <TabsContent value="ranking" className="mt-0 focus-visible:ring-0">
                <SupplierRankingPanel />
              </TabsContent>

              <TabsContent value="alerts" className="mt-0 focus-visible:ring-0">
                <SupplierAlertsPanel />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </ElitePageWrapper>
  );
};

export default SupplierPerformance;
