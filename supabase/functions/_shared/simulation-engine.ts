import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export class SimulationEngine {
  private supabase;
  private results: any[] = [];

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  async runScenario(name: string, fn: () => Promise<any>) {
    const start = performance.now();
    try {
      const result = await fn();
      this.results.push({
        name,
        status: "success",
        duration: performance.now() - start,
        result
      });
      return result;
    } catch (error) {
      this.results.push({
        name,
        status: "error",
        duration: performance.now() - start,
        error: error.message
      });
      throw error;
    }
  }

  getSummary() {
    const total = this.results.length;
    const success = this.results.filter(r => r.status === "success").length;
    const error = this.results.filter(r => r.status === "error").length;
    const avgDuration = this.results.reduce((acc, r) => acc + r.duration, 0) / total;

    return {
      total,
      success,
      error,
      avgDuration: avgDuration.toFixed(2) + "ms",
      details: this.results
    };
  }
}
