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
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useHapticFeedback } from "@/hooks/useMobileGestures";
import { cn } from "@/lib/utils";

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
    <div className="fixed bottom-[4.5rem] sm:bottom-20 right-3 sm:right-4 md:bottom-6 md:right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Action Buttons */}
            <motion.div 
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { delay: index * 0.05 }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 20, 
                    scale: 0.8,
                    transition: { delay: (quickActions.length - index) * 0.02 }
                  }}
                  className="flex items-center gap-3"
                >
                  <motion.span 
                    className="px-3 py-1.5 bg-card border border-border rounded-lg shadow-lg text-sm font-medium whitespace-nowrap"
                    whileHover={{ scale: 1.05 }}
                  >
                    {action.label}
                  </motion.span>
                  <motion.button
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg",
                      action.color
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAction(action)}
                  >
                    <action.icon className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          className={cn(
            "w-14 h-14 rounded-full shadow-xl transition-all duration-300",
            isOpen 
              ? "bg-destructive hover:bg-destructive/90 rotate-45" 
              : "gradient-primary shadow-glow-primary"
          )}
          onClick={toggleOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </Button>
      </motion.div>
    </div>
  );
}
