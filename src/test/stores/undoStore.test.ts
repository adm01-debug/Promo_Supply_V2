import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUndoStore } from "@/stores/undoStore";

describe("UndoStore — Undo/Redo State Management", () => {
  beforeEach(() => {
    useUndoStore.getState().clearHistory();
  });

  describe("addAction", () => {
    it("should add an action to the stack", () => {
      const undoFn = vi.fn();
      useUndoStore.getState().addAction({
        type: "test",
        description: "Test action",
        undo: undoFn,
      });

      expect(useUndoStore.getState().actions).toHaveLength(1);
      expect(useUndoStore.getState().actions[0].description).toBe("Test action");
    });

    it("should generate unique IDs", () => {
      const store = useUndoStore.getState();
      const id1 = store.addAction({ type: "test", description: "A", undo: vi.fn() });
      const id2 = store.addAction({ type: "test", description: "B", undo: vi.fn() });
      expect(id1).not.toBe(id2);
    });

    it("should limit stack to maxActions", () => {
      const store = useUndoStore.getState();
      for (let i = 0; i < 15; i++) {
        store.addAction({ type: "test", description: `Action ${i}`, undo: vi.fn() });
      }
      expect(useUndoStore.getState().actions.length).toBeLessThanOrEqual(10);
    });

    it("should clear redo stack when new action added", async () => {
      const store = useUndoStore.getState();
      store.addAction({ type: "test", description: "A", undo: vi.fn(), redo: vi.fn() });
      await store.undo();
      expect(useUndoStore.getState().redoStack).toHaveLength(1);
      
      useUndoStore.getState().addAction({ type: "test", description: "B", undo: vi.fn() });
      expect(useUndoStore.getState().redoStack).toHaveLength(0);
    });

    it("should place newest action first (LIFO)", () => {
      const store = useUndoStore.getState();
      store.addAction({ type: "test", description: "First", undo: vi.fn() });
      store.addAction({ type: "test", description: "Second", undo: vi.fn() });
      expect(useUndoStore.getState().actions[0].description).toBe("Second");
    });
  });

  describe("undo", () => {
    it("should call undo function on last action", async () => {
      const undoFn = vi.fn();
      useUndoStore.getState().addAction({ type: "test", description: "Test", undo: undoFn });
      
      const result = await useUndoStore.getState().undo();
      expect(result).toBe(true);
      expect(undoFn).toHaveBeenCalledOnce();
    });

    it("should move action to redo stack", async () => {
      useUndoStore.getState().addAction({ type: "test", description: "Test", undo: vi.fn() });
      await useUndoStore.getState().undo();
      
      expect(useUndoStore.getState().actions).toHaveLength(0);
      expect(useUndoStore.getState().redoStack).toHaveLength(1);
    });

    it("should return false when nothing to undo", async () => {
      const result = await useUndoStore.getState().undo();
      expect(result).toBe(false);
    });

    it("should handle async undo functions", async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined);
      useUndoStore.getState().addAction({ type: "test", description: "Async", undo: undoFn });
      
      const result = await useUndoStore.getState().undo();
      expect(result).toBe(true);
      expect(undoFn).toHaveBeenCalled();
    });

    it("should return false if undo function throws", async () => {
      const undoFn = vi.fn().mockRejectedValue(new Error("fail"));
      useUndoStore.getState().addAction({ type: "test", description: "Fail", undo: undoFn });
      
      const result = await useUndoStore.getState().undo();
      expect(result).toBe(false);
    });
  });

  describe("redo", () => {
    it("should redo a previously undone action", async () => {
      const redoFn = vi.fn();
      useUndoStore.getState().addAction({ type: "test", description: "Test", undo: vi.fn(), redo: redoFn });
      await useUndoStore.getState().undo();
      
      const result = await useUndoStore.getState().redo();
      expect(result).toBe(true);
      expect(redoFn).toHaveBeenCalledOnce();
    });

    it("should return false when nothing to redo", async () => {
      const result = await useUndoStore.getState().redo();
      expect(result).toBe(false);
    });

    it("should return false when action has no redo function", async () => {
      useUndoStore.getState().addAction({ type: "test", description: "No redo", undo: vi.fn() });
      await useUndoStore.getState().undo();
      
      const result = await useUndoStore.getState().redo();
      expect(result).toBe(false);
    });

    it("should move action back to undo stack after redo", async () => {
      useUndoStore.getState().addAction({ type: "test", description: "Test", undo: vi.fn(), redo: vi.fn() });
      await useUndoStore.getState().undo();
      await useUndoStore.getState().redo();
      
      expect(useUndoStore.getState().actions).toHaveLength(1);
      expect(useUndoStore.getState().redoStack).toHaveLength(0);
    });
  });

  describe("canUndo / canRedo", () => {
    it("should return false when stacks are empty", () => {
      expect(useUndoStore.getState().canUndo()).toBe(false);
      expect(useUndoStore.getState().canRedo()).toBe(false);
    });

    it("should return true when actions exist", () => {
      useUndoStore.getState().addAction({ type: "test", description: "Test", undo: vi.fn() });
      expect(useUndoStore.getState().canUndo()).toBe(true);
    });
  });

  describe("getLastAction", () => {
    it("should return null when no actions", () => {
      expect(useUndoStore.getState().getLastAction()).toBeNull();
    });

    it("should return most recent action", () => {
      useUndoStore.getState().addAction({ type: "test", description: "Latest", undo: vi.fn() });
      expect(useUndoStore.getState().getLastAction()?.description).toBe("Latest");
    });
  });

  describe("clearHistory", () => {
    it("should clear all stacks", () => {
      useUndoStore.getState().addAction({ type: "test", description: "Test", undo: vi.fn() });
      useUndoStore.getState().clearHistory();
      expect(useUndoStore.getState().actions).toHaveLength(0);
      expect(useUndoStore.getState().redoStack).toHaveLength(0);
    });
  });

  describe("removeAction", () => {
    it("should remove a specific action by ID", () => {
      const id = useUndoStore.getState().addAction({ type: "test", description: "Remove me", undo: vi.fn() });
      useUndoStore.getState().addAction({ type: "test", description: "Keep me", undo: vi.fn() });
      
      useUndoStore.getState().removeAction(id);
      expect(useUndoStore.getState().actions).toHaveLength(1);
      expect(useUndoStore.getState().actions[0].description).toBe("Keep me");
    });
  });
});
