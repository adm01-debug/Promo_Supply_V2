import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Target, Users, Building, Link2, Search, MapPin, 
  Package, Truck, CheckCircle, Info, AlertCircle, 
  TrendingDown, DollarSign, Sparkles, Filter
} from "lucide-react";
import { usePurchaseHistory, type PurchaseRecord } from "@/hooks/usePurchaseHistory";
import { cn } from "@/lib/utils";

export const SourcingHistoryConsole = () => {
  const { purchaseRecords, costCenters } = usePurchaseHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"client" | "supplier">("client");

  const filteredData = useMemo(() => {
    return purchaseRecords.filter(r => 
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.costCenterName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchaseRecords, searchTerm]);

  return (
    <div className="space-y-6">
      <Card className="p-6 border-border/40 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex gap-2">
            <Button variant={viewMode === "client" ? "default" : "outline"} onClick={() => setViewMode("client")}>
              <Users className="w-4 h-4 mr-2" /> Visão Cliente
            </Button>
            <Button variant={viewMode === "supplier" ? "default" : "outline"} onClick={() => setViewMode("supplier")}>
              <Building className="w-4 h-4 mr-2" /> Visão Fornecedor
            </Button>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar histórico..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10"
            />
          </div>
        </div>

        {/* Console Content will be rendered here */}
        <div className="text-center py-20 text-muted-foreground">
          Console de Elite Sourcing inicializado. Dados de {filteredData.length} registros prontos para análise.
        </div>
      </Card>
    </div>
  );
};