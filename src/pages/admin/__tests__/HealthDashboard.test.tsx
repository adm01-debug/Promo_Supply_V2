import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HealthDashboard from "../HealthDashboard";

const mocks = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(),
  query: vi.fn(), mutation: vi.fn(), refetch: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.query,
  useMutation: mocks.mutation,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("../AlertSubscriptionsPanel", () => ({ default: () => null }));
vi.mock("../ScanRunsSlaCard", () => ({ default: () => null }));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => null, LineChart: () => null, Line: () => null,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null,
  Legend: () => null, CartesianGrid: () => null,
}));

type Response = { data: unknown[]; error: null };
type Query = {
  select: () => Query; order: () => Query; limit: () => Query;
  is: () => Query; gte: () => Query; then: Promise<Response>["then"];
};

function query(data: unknown[]): Query {
  const response = Promise.resolve({ data, error: null });
  const builder: Query = {
    select: () => builder, order: () => builder, limit: () => builder,
    is: () => builder, gte: () => builder, then: response.then.bind(response),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Rede bloqueada no teste"); }));
  vi.stubGlobal("WebSocket", vi.fn(() => { throw new Error("WebSocket bloqueado no teste"); }));
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  mocks.channel.mockReturnValue(channel);
  mocks.mutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mocks.query.mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: mocks.refetch });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("contratos do dashboard de saude", () => {
  it("preserva dias no pivot e trata campos nullable/JSON sem conversoes ocultas", async () => {
    let load: (() => Promise<unknown>) | undefined;
    mocks.query.mockImplementation((options: { queryFn: () => Promise<unknown> }) => {
      load = options.queryFn;
      return { data: undefined, isLoading: false, isError: false, refetch: mocks.refetch };
    });
    mocks.from.mockImplementation((table: string) => query(table === "v_system_health_overview"
      ? [{ alert_type: null, severity: null, total_open: null, last_1h: null, last_24h: null, oldest_open: null, most_recent: null }]
      : table === "system_alerts"
        ? [{ id: "alert", alert_type: "scanner", severity: "HIGH", message: null, created_at: null, metadata: ["json", 1] }]
        : []));
    mocks.rpc.mockImplementation((name: string) => Promise.resolve({ data: name === "alerts_severity_timeseries"
      ? [{ day: "2026-11-09", severity: "LOW", cnt: 2 }, { day: "2026-11-08", severity: "HIGH", cnt: 3 }, { day: "2026-11-09", severity: "HIGH", cnt: 4 }]
      : [], error: null }));
    render(<HealthDashboard />);
    if (!load) throw new Error("Query do dashboard nao registrada");
    expect(await load()).toMatchObject({
      open_alerts_by_type: [{ alert_type: "UNKNOWN", severity: "UNKNOWN", open_count: 0, last_1h: 0, last_24h: 0 }],
      severity_timeseries_7d: [{ day: "2026-11-08", HIGH: 3 }, { day: "2026-11-09", LOW: 2, HIGH: 4 }],
      open_alerts: [{ id: "alert", created_at: null, metadata: ["json", 1] }],
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("mostra alerta sem data no periodo completo e o exclui de periodo recente", () => {
    mocks.query.mockReturnValue({
      data: {
        open_alerts_by_type: [], severity_counts_24h: {}, last_runs: [],
        open_alerts: [{ id: "without-date", alert_type: "sem-data", severity: "HIGH", message: "Data ausente", created_at: null, metadata: null }],
      },
      isLoading: false, isError: false, refetch: mocks.refetch,
    });
    render(<HealthDashboard />);
    expect(screen.getByText("Data ausente")).toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Período 1h" }));
    expect(screen.queryByText("Data ausente")).not.toBeInTheDocument();
    expect(screen.getByText("Nenhum alerta corresponde aos filtros atuais.")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
