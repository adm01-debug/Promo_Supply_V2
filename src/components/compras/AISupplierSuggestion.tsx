import { useState } from "react";
import { Brain, Sparkles, ArrowRight, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const AISupplierSuggestion = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isExpanding, setIsExpanding] = useState(false);

  return (
    <Card className="p-6 rounded-2xl border-violet-500/20 bg-violet-500/5 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Brain className="h-16 w-16 text-violet-400" />
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Sourcing Intelligence</h4>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase">Active</Badge>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-4 h-4 text-zinc-400" />
              <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Target: Aluminum Mug</p>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              Found <span className="text-white font-bold">12 qualified suppliers</span> for this category in our Neural Database.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { name: "AluTech Indústria", score: 98, tag: "Strategic Partner" },
              { name: "Brindes Prime Sul", score: 94, tag: "Fast Delivery" }
            ].map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group/item">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{s.name}</p>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">{s.tag}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-violet-400">{s.score}% Match</p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            variant="ghost" 
            className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-violet-500/20 transition-all gap-2"
          >
            Open Sourcing Panel <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};