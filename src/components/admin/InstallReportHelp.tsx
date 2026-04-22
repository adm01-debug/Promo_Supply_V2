import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FlaskConical } from "lucide-react";

const InstallReportHelp = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Como interpretar o relatório de instalação
        </CardTitle>
        <CardDescription>
          O que é "drift", como o detectamos, e o que fazer quando aparece.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <section className="space-y-1">
          <h3 className="font-semibold">As três fontes de verdade</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <span className="font-medium text-foreground">spec</span> — versão declarada em{" "}
              <code className="font-mono">package.json</code>.
            </li>
            <li>
              <span className="font-medium text-foreground">locked</span> — versão fixada no{" "}
              <code className="font-mono">bun.lock</code>.
            </li>
            <li>
              <span className="font-medium text-foreground">installed</span> — versão real em{" "}
              <code className="font-mono">node_modules/</code>.
            </li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="font-semibold">Como o drift é detectado</h3>
          <p className="text-muted-foreground">
            O script <code className="font-mono">scripts/install-report.mjs</code> roda após{" "}
            <code className="font-mono">bun install --frozen-lockfile</code> e compara as três versões.
            Se qualquer par divergir (<code className="font-mono">spec ↔ locked</code>,{" "}
            <code className="font-mono">locked ↔ installed</code> ou{" "}
            <code className="font-mono">spec ↔ installed</code>), marcamos como{" "}
            <span className="font-medium text-destructive">drift</span>. Em CI, a flag{" "}
            <code className="font-mono">--strict</code> faz o job falhar.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">O que fazer quando aparece drift</h3>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2">
            <li>
              <span className="font-medium text-foreground">spec ≠ locked:</span> alguém alterou{" "}
              <code className="font-mono">package.json</code> sem regenerar o lockfile. Rode{" "}
              <code className="font-mono">bun install</code> e commit do <code className="font-mono">bun.lock</code>.
            </li>
            <li>
              <span className="font-medium text-foreground">locked ≠ installed:</span>{" "}
              <code className="font-mono">node_modules</code> está desatualizado. Rode{" "}
              <code className="font-mono">bun install --frozen-lockfile</code> para reinstalar a partir do lockfile.
            </li>
            <li>
              <span className="font-medium text-foreground">spec ≠ installed (mas lock OK):</span>{" "}
              normalmente significa instalação parcial ou cache corrompido. Apague{" "}
              <code className="font-mono">node_modules</code> e rode{" "}
              <code className="font-mono">bun install --frozen-lockfile</code>.
            </li>
            <li>
              <span className="font-medium text-foreground">spec não pinada exatamente:</span> a versão em{" "}
              <code className="font-mono">package.json</code> usa <code className="font-mono">^</code> ou{" "}
              <code className="font-mono">~</code>. Para libs críticas (ex.:{" "}
              <code className="font-mono">date-fns</code>), pinar exato evita upgrades silenciosos.
            </li>
          </ol>
        </section>

        <section className="space-y-1">
          <h3 className="font-semibold">Onde o relatório é gerado</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              Local: <code className="font-mono">bun run verify:install-report</code> (modo strict).
            </li>
            <li>
              Painel: <code className="font-mono">bun run verify:install-report:json</code> grava{" "}
              <code className="font-mono">public/install-report.json</code>.
            </li>
            <li>
              CI: workflow <code className="font-mono">install-report.yml</code> publica o artifact{" "}
              <code className="font-mono">install-report</code> (retenção 30 dias).
            </li>
          </ul>
        </section>
      </CardContent>
    </Card>
  );
};

export default InstallReportHelp;
