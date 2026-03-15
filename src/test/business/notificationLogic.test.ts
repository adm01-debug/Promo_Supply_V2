import { describe, it, expect } from "vitest";

describe("Notification Logic — Preferences & Routing", () => {
  interface NotifPrefs {
    sla_warnings: boolean;
    sla_critical: boolean;
    order_updates: boolean;
    payment_alerts: boolean;
    supplier_alerts: boolean;
    price_alerts: boolean;
    email_notifications: boolean;
    push_notifications: boolean;
    sound_enabled: boolean;
  }

  const defaultPrefs: NotifPrefs = {
    sla_warnings: true, sla_critical: true, order_updates: true,
    payment_alerts: true, supplier_alerts: true, price_alerts: true,
    email_notifications: false, push_notifications: true, sound_enabled: true,
  };

  const shouldNotify = (type: string, prefs: NotifPrefs): boolean => {
    const map: Record<string, keyof NotifPrefs> = {
      sla_warning: "sla_warnings",
      sla_critical: "sla_critical",
      order_update: "order_updates",
      payment_alert: "payment_alerts",
      supplier_alert: "supplier_alerts",
      price_alert: "price_alerts",
    };
    const key = map[type];
    return key ? !!prefs[key] : true; // Unknown types always notify
  };

  const getChannels = (prefs: NotifPrefs) => {
    const channels: string[] = ["in_app"];
    if (prefs.push_notifications) channels.push("push");
    if (prefs.email_notifications) channels.push("email");
    return channels;
  };

  describe("Type-based filtering", () => {
    it("should allow enabled notification types", () => {
      expect(shouldNotify("sla_warning", defaultPrefs)).toBe(true);
      expect(shouldNotify("order_update", defaultPrefs)).toBe(true);
    });

    it("should block disabled notification types", () => {
      const prefs = { ...defaultPrefs, sla_warnings: false };
      expect(shouldNotify("sla_warning", prefs)).toBe(false);
    });

    it("should always allow unknown types", () => {
      expect(shouldNotify("system_alert", defaultPrefs)).toBe(true);
    });

    it("should respect all-disabled state", () => {
      const prefs: NotifPrefs = {
        sla_warnings: false, sla_critical: false, order_updates: false,
        payment_alerts: false, supplier_alerts: false, price_alerts: false,
        email_notifications: false, push_notifications: false, sound_enabled: false,
      };
      expect(shouldNotify("sla_warning", prefs)).toBe(false);
      expect(shouldNotify("payment_alert", prefs)).toBe(false);
    });
  });

  describe("Channel routing", () => {
    it("should always include in_app", () => {
      expect(getChannels(defaultPrefs)).toContain("in_app");
    });

    it("should include push when enabled", () => {
      expect(getChannels(defaultPrefs)).toContain("push");
    });

    it("should not include email by default", () => {
      expect(getChannels(defaultPrefs)).not.toContain("email");
    });

    it("should include email when enabled", () => {
      const prefs = { ...defaultPrefs, email_notifications: true };
      expect(getChannels(prefs)).toContain("email");
    });

    it("should only have in_app when all disabled", () => {
      const prefs = { ...defaultPrefs, push_notifications: false, email_notifications: false };
      expect(getChannels(prefs)).toEqual(["in_app"]);
    });
  });

  describe("Priority classification", () => {
    const classifyPriority = (type: string, metadata?: Record<string, unknown>) => {
      if (type === "sla_critical") return "critical";
      if (type === "sla_warning") return "high";
      if (type === "payment_alert") return "high";
      if (type === "order_update") return "medium";
      if (type === "price_alert") return "low";
      return "medium";
    };

    it("should classify SLA critical as critical", () => {
      expect(classifyPriority("sla_critical")).toBe("critical");
    });

    it("should classify payment alerts as high", () => {
      expect(classifyPriority("payment_alert")).toBe("high");
    });

    it("should default to medium for unknown", () => {
      expect(classifyPriority("custom_type")).toBe("medium");
    });
  });

  describe("Notification deduplication", () => {
    const deduplicate = (notifications: { type: string; entity_id: string; created_at: string }[], windowMs = 60000) => {
      const seen = new Map<string, string>();
      return notifications.filter(n => {
        const key = `${n.type}:${n.entity_id}`;
        const lastSeen = seen.get(key);
        if (lastSeen) {
          const diff = new Date(n.created_at).getTime() - new Date(lastSeen).getTime();
          if (diff < windowMs) return false;
        }
        seen.set(key, n.created_at);
        return true;
      });
    };

    it("should remove duplicates within window", () => {
      const notifs = [
        { type: "sla_warning", entity_id: "1", created_at: "2026-03-15T10:00:00Z" },
        { type: "sla_warning", entity_id: "1", created_at: "2026-03-15T10:00:30Z" },
      ];
      expect(deduplicate(notifs)).toHaveLength(1);
    });

    it("should keep notifications outside window", () => {
      const notifs = [
        { type: "sla_warning", entity_id: "1", created_at: "2026-03-15T10:00:00Z" },
        { type: "sla_warning", entity_id: "1", created_at: "2026-03-15T10:05:00Z" },
      ];
      expect(deduplicate(notifs)).toHaveLength(2);
    });

    it("should keep different entity notifications", () => {
      const notifs = [
        { type: "sla_warning", entity_id: "1", created_at: "2026-03-15T10:00:00Z" },
        { type: "sla_warning", entity_id: "2", created_at: "2026-03-15T10:00:00Z" },
      ];
      expect(deduplicate(notifs)).toHaveLength(2);
    });
  });
});
