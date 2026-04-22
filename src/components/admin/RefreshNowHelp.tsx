import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, RefreshCw, KeyRound, CloudOff } from "lucide-react";

const RefreshNowHelp = () => {
  return (
    <Card aria-labelledby="refresh-now-help-title">
      <CardHeader>
        <CardTitle id="refresh-now-help-title" className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          Como funciona o "Atualizar agora"
        </CardTitle>
        <CardDescription>
          Guia rápido sobre o botão de refresh, o segredo necessário e o comportamento de fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <section className="space-y-1.5">
          <div className="flex items-center gap-2 font-medium">
            <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
            O que o botão faz
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Dispara a edge function <code className="font-mono text-xs">dependency-health</code> (POST), que
            busca <code className="font-mono text-xs">package.json</code> e{" "}
            <code className="font-mono text-xs">bun.lock</code> direto do GitHub, recalcula o snapshot
            (drift, tree-shaking, pacotes monitorados) e grava o resultado no banco. O snapshot e o
            histórico (últimos 30) são atualizados imediatamente — não é preciso esperar o CI.
          </p>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center gap-2 font-medium">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            Segredo necessário
          </div>
          <p className="text-muted-foreground leading-relaxed">
            A função exige o segredo <Badge variant="outline" className="font-mono text-xs">GITHUB_REPO_RAW_BASE</Badge>{" "}
            apontando para a base raw do repositório (ex.:{" "}
            <code className="font-mono text-xs">https://raw.githubusercontent.com/&lt;owner&gt;/&lt;repo&gt;/main</code>).
            Sem ele o POST devolve <code className="font-mono text-xs">500</code> com a mensagem
            "GITHUB_REPO_RAW_BASE secret not configured". Para o botão "Atualizar & commitar no repo" é
            preciso também <Badge variant="outline" className="font-mono text-xs">GITHUB_DISPATCH_TOKEN</Badge>{" "}
            (PAT com permissão de workflow dispatch).
          </p>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center gap-2 font-medium">
            <CloudOff className="h-4 w-4 text-destructive" aria-hidden="true" />
            Quando o GitHub está fora do ar
          </div>
          <p className="text-muted-foreground leading-relaxed">
            A edge function tenta cada arquivo até <strong>3 vezes</strong> com backoff exponencial
            (300ms → 600ms → 1200ms + jitter, timeout 10s por tentativa). Só refaz a tentativa em erros
            transitórios (5xx, 408, 429) ou falhas de rede. Se nenhuma tentativa funcionar, o POST
            retorna <code className="font-mono text-xs">502 Bad Gateway</code> com{" "}
            <code className="font-mono text-xs">error</code>, <code className="font-mono text-xs">detail</code>,{" "}
            <code className="font-mono text-xs">status</code>, <code className="font-mono text-xs">attempts</code>{" "}
            e a <code className="font-mono text-xs">url</code> que falhou — exibido em destaque acima.
            O snapshot anterior (banco) e o JSON estático em{" "}
            <code className="font-mono text-xs">/dependency-health.json</code> continuam disponíveis via
            GET, então a tela nunca fica em branco.
          </p>
        </section>
      </CardContent>
    </Card>
  );
};

export default RefreshNowHelp;
