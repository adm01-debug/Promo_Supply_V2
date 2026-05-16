import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BreadcrumbsProps {
  className?: string;
  variant?: "pills" | "compact" | "ghost";
}

const routeLabels: Record<string, string> = {
  "cotacao": "Cotações",
  "solicitacoes": "Solicitações",
  "pedidos": "Pedidos",
  "pagamentos": "Pagamentos",
  "fornecedores": "Fornecedores",
  "relatorios": "Relatórios",
  "acompanhamento": "Acompanhamento",
  "contratos": "Contratos",
  "licitacoes": "Licitações",
  "compliance": "Compliance",
  "dashboard-executivo": "Dashboard Executivo",
  "kanban": "Quadro Kanban",
  "catalogo-produtos": "Catálogo",
  "portal-fornecedor": "Portal do Fornecedor",
  "historico-compras": "Histórico",
  "gerar-ordem": "Gerar Ordem",
  "negociacoes": "Negociações",
  "configuracoes": "Configurações",
  "buyer": "Área do Comprador",
  "admin": "Administração",
};

export function Breadcrumbs({ className, variant = "ghost" }: BreadcrumbsProps) {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (location.pathname === "/" || location.pathname === "/compras") return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            to="/"
            className={cn(
              "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-[0.98]",
              variant === "pills" && "bg-muted/40 px-2.5 py-1.5 rounded-lg hover:bg-muted shadow-sm"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            {variant !== "compact" && <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>}
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);

          return (
            <li key={to} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
              {last ? (
                <motion.span
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "font-bold text-foreground truncate max-w-[180px]",
                    variant === "pills" && "bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20"
                  )}
                  aria-current="page"
                >
                  {label}
                </motion.span>
              ) : (
                <Link
                  to={to}
                  className={cn(
                    "text-muted-foreground hover:text-foreground transition-all duration-200 truncate max-w-[140px] active:scale-[0.98]",
                    variant === "pills" && "bg-muted/40 px-2.5 py-1.5 rounded-lg hover:bg-muted shadow-sm"
                  )}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
