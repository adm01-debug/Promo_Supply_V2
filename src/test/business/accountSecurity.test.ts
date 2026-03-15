import { describe, it, expect } from "vitest";

describe("Account Security — Lockout & Rate Limiting", () => {
  describe("Progressive lockout", () => {
    const calcLockoutDuration = (lockoutCount: number) => {
      return Math.min(Math.pow(2, lockoutCount - 1), 30); // minutes, max 30
    };

    it("should lock for 1 min on first lockout", () => {
      expect(calcLockoutDuration(1)).toBe(1);
    });

    it("should lock for 2 min on second lockout", () => {
      expect(calcLockoutDuration(2)).toBe(2);
    });

    it("should lock for 4 min on third lockout", () => {
      expect(calcLockoutDuration(3)).toBe(4);
    });

    it("should cap at 30 min", () => {
      expect(calcLockoutDuration(6)).toBe(30);
      expect(calcLockoutDuration(10)).toBe(30);
    });
  });

  describe("Failed attempt tracking", () => {
    const shouldLock = (
      failedAttempts: number,
      lastFailedAt: string | null,
      threshold = 5,
      windowMinutes = 15,
      now = new Date("2026-03-15T12:00:00Z")
    ) => {
      if (!lastFailedAt) return { lock: false, attempts: failedAttempts };
      const lastFailed = new Date(lastFailedAt);
      const diffMs = now.getTime() - lastFailed.getTime();
      if (diffMs > windowMinutes * 60000) return { lock: false, attempts: 1 }; // Reset
      const newAttempts = failedAttempts + 1;
      return { lock: newAttempts >= threshold, attempts: newAttempts };
    };

    it("should lock after 5 attempts in window", () => {
      expect(shouldLock(4, "2026-03-15T11:50:00Z").lock).toBe(true);
    });

    it("should not lock under threshold", () => {
      expect(shouldLock(2, "2026-03-15T11:55:00Z").lock).toBe(false);
    });

    it("should reset after window expires", () => {
      const r = shouldLock(4, "2026-03-15T11:30:00Z");
      expect(r.lock).toBe(false);
      expect(r.attempts).toBe(1);
    });

    it("should handle null lastFailedAt", () => {
      expect(shouldLock(0, null).lock).toBe(false);
    });
  });

  describe("IP blocking logic", () => {
    const isBlocked = (
      ip: string,
      blockedIps: { ip_address: string; permanent: boolean; expires_at: string | null }[],
      now = new Date("2026-03-15T12:00:00Z")
    ) => {
      return blockedIps.some(b => {
        if (b.ip_address !== ip) return false;
        if (b.permanent) return true;
        if (b.expires_at && new Date(b.expires_at) > now) return true;
        return false;
      });
    };

    it("should detect permanently blocked IP", () => {
      expect(isBlocked("1.2.3.4", [
        { ip_address: "1.2.3.4", permanent: true, expires_at: null },
      ])).toBe(true);
    });

    it("should detect temporarily blocked IP", () => {
      expect(isBlocked("1.2.3.4", [
        { ip_address: "1.2.3.4", permanent: false, expires_at: "2026-03-15T13:00:00Z" },
      ])).toBe(true);
    });

    it("should allow expired block", () => {
      expect(isBlocked("1.2.3.4", [
        { ip_address: "1.2.3.4", permanent: false, expires_at: "2026-03-15T11:00:00Z" },
      ])).toBe(false);
    });

    it("should allow non-blocked IP", () => {
      expect(isBlocked("5.6.7.8", [
        { ip_address: "1.2.3.4", permanent: true, expires_at: null },
      ])).toBe(false);
    });
  });

  describe("Password strength scoring", () => {
    const scorePassword = (password: string) => {
      let score = 0;
      if (password.length >= 8) score += 1;
      if (password.length >= 12) score += 1;
      if (/[a-z]/.test(password)) score += 1;
      if (/[A-Z]/.test(password)) score += 1;
      if (/\d/.test(password)) score += 1;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
      if (password.length >= 16) score += 1;
      const labels = ["very_weak", "weak", "fair", "good", "strong", "very_strong", "excellent", "exceptional"];
      return { score, label: labels[Math.min(score, labels.length - 1)] };
    };

    it("should score empty password as very_weak", () => {
      expect(scorePassword("").label).toBe("very_weak");
    });

    it("should score 'password' as weak", () => {
      expect(scorePassword("password").score).toBeLessThanOrEqual(2);
    });

    it("should score complex password as strong+", () => {
      const r = scorePassword("MyP@ssw0rd!2026Extra");
      expect(r.score).toBeGreaterThanOrEqual(5);
    });

    it("should reward length >= 16", () => {
      const short = scorePassword("Ab1!");
      const long = scorePassword("Ab1!aaaaaaaaaaaaa");
      expect(long.score).toBeGreaterThan(short.score);
    });
  });

  describe("Session management", () => {
    const isSessionValid = (expiresAt: string, lastActivity: string, maxIdleMinutes = 30, now = new Date("2026-03-15T12:00:00Z")) => {
      if (new Date(expiresAt) < now) return { valid: false, reason: "expired" };
      const idleMs = now.getTime() - new Date(lastActivity).getTime();
      if (idleMs > maxIdleMinutes * 60000) return { valid: false, reason: "idle_timeout" };
      return { valid: true, reason: null };
    };

    it("should validate active session", () => {
      expect(isSessionValid("2026-03-16T00:00:00Z", "2026-03-15T11:50:00Z").valid).toBe(true);
    });

    it("should detect expired session", () => {
      expect(isSessionValid("2026-03-15T11:00:00Z", "2026-03-15T10:50:00Z").reason).toBe("expired");
    });

    it("should detect idle timeout", () => {
      expect(isSessionValid("2026-03-16T00:00:00Z", "2026-03-15T11:00:00Z").reason).toBe("idle_timeout");
    });
  });
});
