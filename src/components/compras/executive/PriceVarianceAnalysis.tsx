import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { GitCompare, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { formatCurrency } from './executiveDashboardData';
import { cn } from '@/lib/utils';

const priceVarianceData = [
  { item: 'Notebook Dell', minPrice: 4500, maxPrice: 5800, variance: 28.8, avgPrice: 5150 },
  { item: 'Cadeira Ergonômica', minPrice: 850, maxPrice: 1200, variance: 41.1, avgPrice: 1025 },
  { item: 'Papel A4 (Cx)', minPrice: 180, maxPrice: 210, variance: 16.6, avgPrice: 195 },
  { item: 'Licença Software', minPrice: 1200, maxPrice: 1250, variance: 4.1, avgPrice: 1225 },
  { item: 'Monitor 24"', minPrice: 750, maxPrice: 950, variance: 26.6, avgPrice: 850 },
];

export const PriceVarianceAnalysis = () => {
  return (
    <Card className="h-full border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-3 font-black text-white uppercase tracking-tight">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
            <GitCompare className="h-5 w-5 animate-pulse" />
          </div>
          Price Variance (SKU)
        </CardTitle>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Min vs Max comparison per item in period</p>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 300 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priceVarianceData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-white/5" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="item" 
                type="category" 
                className="text-[10px] font-black fill-zinc-500" 
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#05020a]/95 border border-white/10 p-3 rounded-xl shadow-2xl text-[10px] space-y-1">
                        <p className="font-black uppercase tracking-widest text-zinc-400 mb-2">{data.item}</p>
                        <div className="space-y-1">
                          <p className="flex justify-between gap-4"><span className="text-zinc-500 uppercase font-bold">Min:</span> <span className="font-black text-white">{formatCurrency(data.minPrice)}</span></p>
                          <p className="flex justify-between gap-4"><span className="text-zinc-500 uppercase font-bold">Max:</span> <span className="font-black text-white">{formatCurrency(data.maxPrice)}</span></p>
                          <div className="pt-1 mt-1 border-t border-white/5 flex justify-between gap-4">
                            <span className="text-violet-400 uppercase font-bold">Variance:</span>
                            <span className="font-black text-violet-400">{data.variance}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="variance" name="Variação %" radius={[0, 4, 4, 0]} barSize={20}>
                {priceVarianceData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.variance > 30 ? '#fb7185' : entry.variance > 15 ? '#fbbf24' : '#8b5cf6'} 
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        
        <div className="mt-6 flex items-start gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 animate-in fade-in zoom-in duration-700 delay-500">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-zinc-400 font-bold">
            <strong className="text-zinc-100 uppercase tracking-widest mr-1">Opportunity:</strong> Items like "Cadeira Ergonômica" show variation above 40%. Consolidating purchases for these items can generate an estimated additional saving of 15%.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
