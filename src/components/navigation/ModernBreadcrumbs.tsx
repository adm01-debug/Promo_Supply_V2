import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BreadcrumbsProps {
  className?: string;
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
  "dashboard-executivo": "Executivo",
  "kanban": "Kanban",
  "catalogo-produtos": "Catálogo",
  "portal-fornecedor": "Portal",
  "historico-compras": "Histórico",
  "gerar-ordem": "Gerar Ordem",
  "negociacoes": "Negociações",
  "configuracoes": "Configurações",
  "buyer": "Comprador",
  "admin": "Admin",
  "sourcing": "Sourcing",
  "aprovacoes": "Aprovações",
  "auditoria": "Auditoria",
  "seguranca": "Segurança",
};

/**
 * Modern Breadcrumbs 10/10 with glassmorphism and smooth animations.
 */
export const ModernBreadcrumbs = ({ className }: BreadcrumbsProps) => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const crumbs = useMemo(() => {
    return pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join("/")}`;
      const label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);
      return { to, label };
    });
  }, [pathnames]);

  if (location.pathname === "/" || location.pathname === "/compras") return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center space-x-1 text-xs text-muted-foreground/60", className)}
    >
      <Link
        to="/"
        className="flex items-center hover:text-primary transition-colors duration-200"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, index) => (
        <React.Fragment key={crumb.to}>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {index === crumbs.length - 1 ? (
              <span className="font-bold text-foreground/90 truncate max-w-[120px] sm:max-w-none">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="hover:text-primary transition-colors duration-200 truncate max-w-[80px] sm:max-w-none"
              >
                {crumb.label}
              </Link>
            )}
          </motion.div>
        </React.Fragment>
      ))}
    </nav>
  );
};
