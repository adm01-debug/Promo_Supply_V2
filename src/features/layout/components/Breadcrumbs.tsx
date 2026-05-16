import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigation } from "@/hooks/useNavigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { breadcrumbLabel } = useNavigation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (location.pathname === "/" || location.pathname === "/compras") return null;

  const MAX_VISIBLE = 3;
  const shouldTruncate = pathnames.length > MAX_VISIBLE;

  return (
    <Breadcrumb className={cn("print:hidden py-1", className)}>
      <BreadcrumbList className="gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to="/"
              className={cn(
                "flex items-center gap-1.5 transition-all duration-300 active:scale-[0.92] group",
                variant === "pills" && "bg-background/40 backdrop-blur-md px-4 py-2 rounded-2xl hover:bg-primary/10 hover:text-primary shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-border/20"
              )}
            >
              <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
              {variant !== "compact" && <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100">Início</span>}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {shouldTruncate && (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <BreadcrumbEllipsis className="h-4 w-4" />
                  <span className="sr-only">Toggle menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {pathnames.slice(0, -2).map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                    const label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);
                    return (
                      <DropdownMenuItem key={to} asChild>
                        <Link to={to}>{label}</Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {pathnames.slice(shouldTruncate ? -2 : 0).map((value, index) => {
          const actualIndex = shouldTruncate ? pathnames.length - 2 + index : index;
          const last = actualIndex === pathnames.length - 1;
          const to = `/${pathnames.slice(0, actualIndex + 1).join("/")}`;
          const isCustomLabel = last && breadcrumbLabel;
          const label = isCustomLabel ? breadcrumbLabel : (routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1));

          return (
            <React.Fragment key={to}>
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage
                    className={cn(
                      "font-black text-foreground truncate max-w-[220px] uppercase tracking-wider",
                      variant === "pills" && "bg-primary/10 text-primary px-5 py-2 rounded-2xl border border-primary/20 shadow-[0_8px_16px_rgba(var(--primary-rgb),0.12)] backdrop-blur-sm"
                    )}
                  >
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {label}
                    </motion.span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={to}
                      className={cn(
                        "transition-all duration-300 truncate max-w-[150px] active:scale-[0.92] font-bold uppercase tracking-widest group",
                        variant === "pills" && "bg-background/40 backdrop-blur-md px-4 py-2 rounded-2xl hover:bg-primary/5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-border/20"
                      )}
                    >
                      <span className="opacity-70 group-hover:opacity-100 transition-opacity">{label}</span>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
