import { cn } from "@/lib/utils";

interface SkipLink {
  href: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { href: "#main-content", label: "Pular para o conteúdo principal" },
  { href: "#main-navigation", label: "Pular para a navegação" },
];

export const SkipLinks = ({ links = defaultLinks }: SkipLinksProps) => {
  return (
    <div className="skip-links">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className={cn(
            "sr-only focus:not-sr-only",
            "focus:fixed focus:top-4 focus:left-4 focus:z-[9999]",
            "focus:px-4 focus:py-2 focus:rounded-lg",
            "focus:bg-primary focus:text-primary-foreground",
            "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring",
            "focus:animate-slide-down"
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};
