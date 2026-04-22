import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, ChevronRight, ExternalLink, Globe, Search, Sigma } from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { parseISO } from "date-fns/parseISO";
import { ptBR } from "date-fns/locale/pt-BR";

interface UsageEntry {
  subpath: string;
  exports: string[];
}

interface CiMetadata {
  provider?: string;
  repository?: string;
  workflow?: string | null;
  runId?: string;
  runAttempt?: string | null;
  runUrl?: string;
  latestRunsUrl?: string;
}

interface UsageManifest {
  generatedAt: string;
  totalSubpaths: number;
  totalFunctions: number;
  totalLocales: number;
  functions: UsageEntry[];
  locales: UsageEntry[];
  ci?: CiMetadata;
}

const fetchManifest = async (): Promise<UsageManifest> => {
  const res = await fetch("/datefns-usage.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

type SortKey = "subpath" | "count";
type SortDir = "asc" | "desc";

const sortEntries = (rows: UsageEntry[], key: SortKey, dir: SortDir): UsageEntry[] => {
  const sorted = [...rows].sort((a, b) => {
    const cmp = key === "subpath" ? a.subpath.localeCompare(b.subpath) : a.exports.length - b.exports.length;
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
};

const UsageTable = ({
  rows,
  emptyLabel,
}: {
  rows: UsageEntry[];
  emptyLabel: string;
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("subpath");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortEntries(rows, sortKey, sortDir), [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">{emptyLabel}</div>;
  }

  return (
    <div className="rounded-md border max-h-80 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                onClick={() => toggleSort("subpath")}
                className="font-medium hover:text-foreground"
                aria-label="Ordenar por subpath"
              >
                Subpath {sortKey === "subpath" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </button>
            </TableHead>
            <TableHead>Exports</TableHead>
            <TableHead className="w-20 text-right">
              <button
                type="button"
                onClick={() => toggleSort("count")}
                className="font-medium hover:text-foreground"
                aria-label="Ordenar por contagem"
              >
                # {sortKey === "count" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.subpath}>
              <TableCell className="font-mono text-xs">{row.subpath}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {row.exports.map((exp) => (
                    <Badge key={exp} variant="secondary" className="font-mono text-xs">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-right">{row.exports.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const DateFnsUsagePanel = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["datefns-usage-static"],
    queryFn: fetchManifest,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [search, setSearch] = useState("");
  const [fnsOpen, setFnsOpen] = useState(true);
  const [localesOpen, setLocalesOpen] = useState(true);

  const filteredFunctions = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.functions;
    return data.functions.filter(
      (row) =>
        row.subpath.toLowerCase().includes(q) ||
        row.exports.some((e) => e.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const filteredLocales = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.locales;
    return data.locales.filter(
      (row) =>
        row.subpath.toLowerCase().includes(q) ||
        row.exports.some((e) => e.toLowerCase().includes(q)),
    );
  }, [data, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sigma className="h-5 w-5 text-primary" />
          Uso de date-fns detectado
        </CardTitle>
        <CardDescription>
          Subpaths e locales detectados pela última execução de{" "}
          <code className="font-mono">scripts/generate-datefns-smoke-test.mjs</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando manifesto…</div>
        ) : error || !data ? (
          <div className="text-sm text-muted-foreground">
            Manifesto não encontrado. Rode{" "}
            <code className="font-mono">node scripts/generate-datefns-smoke-test.mjs</code>.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Sigma className="h-3 w-3" />
                {data.totalSubpaths} subpaths
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sigma className="h-3 w-3" />
                {data.totalFunctions} função exports
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" />
                {data.totalLocales} locales
              </Badge>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                atualizado{" "}
                {formatDistanceToNow(parseISO(data.generatedAt), { addSuffix: true, locale: ptBR })}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por subpath ou export…"
                className="pl-9"
                aria-label="Filtrar tabelas de uso"
              />
            </div>

            <Collapsible open={fnsOpen} onOpenChange={setFnsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2">
                  {fnsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">Funções ({filteredFunctions.length})</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <UsageTable rows={filteredFunctions} emptyLabel="Nenhuma função correspondente." />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={localesOpen} onOpenChange={setLocalesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2">
                  {localesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">Locales ({filteredLocales.length})</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <UsageTable rows={filteredLocales} emptyLabel="Nenhum locale correspondente." />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DateFnsUsagePanel;
