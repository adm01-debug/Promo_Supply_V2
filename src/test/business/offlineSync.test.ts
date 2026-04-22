import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Offline Sync — Queue Management", () => {
  const STORAGE_KEY = "offline_pending_operations";
  const MAX_RETRIES = 3;

  interface PendingOperation {
    id: string;
    type: "create" | "update" | "delete";
    table: string;
    data: Record<string, unknown>;
    timestamp: number;
    retries: number;
  }

  const getPending = (): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };

  const savePending = (ops: PendingOperation[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  };

  const addOperation = (op: Omit<PendingOperation, "id" | "timestamp" | "retries">) => {
    const pending = getPending();
    const newOp: PendingOperation = {
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      retries: 0,
    };
    pending.push(newOp);
    savePending(pending);
    return newOp;
  };

  const removeOperation = (id: string) => {
    savePending(getPending().filter(o => o.id !== id));
  };

  const incrementRetry = (id: string) => {
    const pending = getPending().map(o =>
      o.id === id ? { ...o, retries: o.retries + 1 } : o
    );
    savePending(pending);
  };

  const getFailedOps = () => getPending().filter(o => o.retries >= MAX_RETRIES);

  beforeEach(() => {
    localStorage.clear();
  });

  describe("Queue operations", () => {
    it("should add operation to empty queue", () => {
      addOperation({ type: "create", table: "solicitacoes", data: { titulo: "Test" } });
      expect(getPending()).toHaveLength(1);
    });

    it("should maintain FIFO order", () => {
      addOperation({ type: "create", table: "t1", data: { a: 1 } });
      addOperation({ type: "update", table: "t2", data: { b: 2 } });
      const ops = getPending();
      expect(ops[0].table).toBe("t1");
      expect(ops[1].table).toBe("t2");
    });

    it("should remove specific operation", () => {
      const op1 = addOperation({ type: "create", table: "t1", data: {} });
      addOperation({ type: "create", table: "t2", data: {} });
      removeOperation(op1.id);
      expect(getPending()).toHaveLength(1);
      expect(getPending()[0].table).toBe("t2");
    });

    it("should handle removing non-existent id", () => {
      addOperation({ type: "create", table: "t1", data: {} });
      removeOperation("non-existent");
      expect(getPending()).toHaveLength(1);
    });

    it("should generate unique IDs", () => {
      const op1 = addOperation({ type: "create", table: "t1", data: {} });
      const op2 = addOperation({ type: "create", table: "t2", data: {} });
      expect(op1.id).not.toBe(op2.id);
    });
  });

  describe("Retry logic", () => {
    it("should increment retry count", () => {
      const op = addOperation({ type: "create", table: "t1", data: {} });
      incrementRetry(op.id);
      expect(getPending()[0].retries).toBe(1);
    });

    it("should detect failed operations after max retries", () => {
      const op = addOperation({ type: "create", table: "t1", data: {} });
      for (let i = 0; i < MAX_RETRIES; i++) incrementRetry(op.id);
      expect(getFailedOps()).toHaveLength(1);
    });

    it("should not flag as failed before max retries", () => {
      const op = addOperation({ type: "create", table: "t1", data: {} });
      incrementRetry(op.id);
      incrementRetry(op.id);
      expect(getFailedOps()).toHaveLength(0);
    });
  });

  describe("Conflict detection", () => {
    const hasConflict = (ops: PendingOperation[]) => {
      const seen = new Map<string, string>();
      for (const op of ops) {
        const key = `${op.table}:${op.data["id"] || "new"}`;
        if (seen.has(key)) return true;
        seen.set(key, op.id);
      }
      return false;
    };

    it("should detect duplicate operations on same entity", () => {
      const ops: PendingOperation[] = [
        { id: "1", type: "update", table: "pedidos", data: { id: "abc" }, timestamp: 1, retries: 0 },
        { id: "2", type: "update", table: "pedidos", data: { id: "abc" }, timestamp: 2, retries: 0 },
      ];
      expect(hasConflict(ops)).toBe(true);
    });

    it("should not flag different entities", () => {
      const ops: PendingOperation[] = [
        { id: "1", type: "update", table: "pedidos", data: { id: "abc" }, timestamp: 1, retries: 0 },
        { id: "2", type: "update", table: "pedidos", data: { id: "def" }, timestamp: 2, retries: 0 },
      ];
      expect(hasConflict(ops)).toBe(false);
    });

    it("should handle empty queue", () => {
      expect(hasConflict([])).toBe(false);
    });
  });

  describe("Batch size limiting", () => {
    it("should process operations in batches", () => {
      for (let i = 0; i < 25; i++) {
        addOperation({ type: "create", table: "t1", data: { i } });
      }
      const batchSize = 10;
      const batch = getPending().slice(0, batchSize);
      expect(batch).toHaveLength(10);
      expect(getPending()).toHaveLength(25);
    });
  });
});
