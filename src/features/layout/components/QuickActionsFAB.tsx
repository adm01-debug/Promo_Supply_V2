import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  FileText, 
  Package, 
  DollarSign, 
  Users, 
  X,
  Search,
  BarChart3,
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
}

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { lightTap, success } = useHapticFeedback();

  const quickActions: QuickAction[] = [
    {
      id: "nova-solicitacao",
      label: "Nova Solicitação",
      icon: FileText,
      color: "bg-primary hover:bg-primary/90",
      action: () => {
        navigate("/solicitacoes");
        success();
      }
    },
    {
      id: "novo-pedido",
      label: "Novo Pedido",
      icon: Package,
      color: "bg-info hover:bg-info/90",
      action: () => {
        navigate("/pedidos");
        success();
      }
    },
    {
      id: "novo-pagamento",
      label: "Novo Pagamento",
      icon: DollarSign,
      color: "bg-success hover:bg-success/90",
      action: () => {
        navigate("/pagamentos");
        success();
      }
    },
    {
      id: "novo-fornecedor",
      label: "Novo Fornecedor",
      icon: Users,
      color: "bg-warning hover:bg-warning/90",
      action: () => {
        navigate("/fornecedores");
        success();
      }
    },
    {
      id: "buscar",
      label: "Buscar",
      icon: Search,
      color: "bg-secondary hover:bg-secondary/90 text-foreground",
      action: () => {
        // Trigger command palette
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
        window.dispatchEvent(event);
        success();
      }
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      color: "bg-accent hover:bg-accent/90 text-accent-foreground",
      action: () => {
        navigate("/compras");
        success();
      }
    }
  ];

  const toggleOpen = () => {
    lightTap();
    setIsOpen(!isOpen);
  };

  const handleAction = (action: QuickAction) => {
    action.action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Ultra-premium Backdrop */}
            <motion.div
              className="fixed inset-0 bg-background/20 backdrop-blur-[12px] z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Quick Actions Panel */}
            <motion.div 
              className="absolute bottom-20 right-0 flex flex-col-reverse gap-4 items-end z-50 w-72"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <div className="w-full bg-card/90 backdrop-blur-2xl border border-primary/10 shadow-2xl rounded-[2.5rem] p-3 overflow-hidden">
                <div className="flex flex-col gap-1">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ 
                        opacity: 1, 
                        x: 0,
                        transition: { delay: index * 0.05 }
                      }}
                      whileHover={{ x: -4, backgroundColor: "hsl(var(--primary) / 0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAction(action)}
                      className="group flex items-center justify-between w-full p-3 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
                          action.color
                        )}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold tracking-tight text-foreground/90">{action.label}</p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Acesso Rápido</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                    </motion.button>
                  ))}
                </div>
                
                <div className="mt-2 pt-2 border-t border-primary/5 px-3 pb-1">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">PROMO SUPPLY AI</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Trigger FAB */}
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <motion.div
              className="relative z-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
            >
              <Button
                size="lg"
                className={cn(
                  "w-16 h-16 rounded-[2rem] shadow-2xl transition-all duration-500 group",
                  isOpen 
                    ? "bg-destructive hover:bg-destructive/90 border-destructive/20" 
                    : "gradient-primary shadow-glow-primary border-none"
                )}
                onClick={toggleOpen}
              >
                <AnimatePresence mode="wait">
                  {isOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                    >
                      <X className="w-7 h-7" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="plus"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      className="relative"
                    >
                      <Layers className="w-7 h-7 transition-transform group-hover:scale-110" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </TooltipTrigger>
          {!isOpen && <TooltipContent side="left" className="font-bold">Ações Rápidas</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
