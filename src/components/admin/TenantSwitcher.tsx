import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantSwitcher() {
  const { tenantId, availableTenants, switchTenant } = useAuth();

  if (availableTenants.length <= 1) return null;

  const currentTenant = availableTenants.find((t) => t.id === tenantId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 border-dashed border-primary/30 hover:border-primary/60 transition-colors gap-2"
        >
          <Building2 className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline font-medium text-xs truncate max-w-[120px]">
            {currentTenant?.name || "Selecionar Organização"}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Suas Organizações
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => switchTenant(tenant.id)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              tenant.id === tenantId && "bg-primary/5 font-medium"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{tenant.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase">
                {tenant.slug}
              </span>
            </div>
            {tenant.id === tenantId && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
