import { Atom } from "../atoms/Atom";
import { cn } from "@/lib/utils";

interface MoleculeProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Molecule = ({ title, description, children, className }: MoleculeProps) => {
  return (
    <Atom className={cn("flex flex-col gap-2 p-4 border rounded-lg bg-card", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="mt-2">{children}</div>
    </Atom>
  );
};
