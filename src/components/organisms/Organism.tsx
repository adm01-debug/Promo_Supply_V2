import { Molecule } from "../molecules/Molecule";
import { cn } from "@/lib/utils";

interface OrganismProps {
  header: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Organism = ({ header, content, footer, className }: OrganismProps) => {
  return (
    <div className={cn("grid gap-6 p-6 border rounded-xl bg-background/50 backdrop-blur-sm", className)}>
      <header className="flex items-center justify-between border-b pb-4">
        {header}
      </header>
      <main className="grid gap-4">
        {content}
      </main>
      {footer && (
        <footer className="pt-4 border-t">
          {footer}
        </footer>
      )}
    </div>
  );
};
