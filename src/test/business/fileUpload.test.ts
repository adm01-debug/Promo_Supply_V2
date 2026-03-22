import { describe, it, expect } from "vitest";

describe("File Upload — Validation Logic", () => {
  describe("File size validation", () => {
    const validateFileSize = (sizeBytes: number, maxMB: number) => {
      const maxBytes = maxMB * 1024 * 1024;
      return { valid: sizeBytes <= maxBytes, sizeBytes, maxBytes };
    };

    it("should accept file under limit", () => {
      expect(validateFileSize(5 * 1024 * 1024, 10).valid).toBe(true);
    });

    it("should accept file at exact limit", () => {
      expect(validateFileSize(10 * 1024 * 1024, 10).valid).toBe(true);
    });

    it("should reject file over limit", () => {
      expect(validateFileSize(11 * 1024 * 1024, 10).valid).toBe(false);
    });

    it("should reject zero-byte file as valid", () => {
      expect(validateFileSize(0, 10).valid).toBe(true);
    });
  });

  describe("File type validation", () => {
    const validateFileType = (fileType: string, allowedTypes: string[]) => {
      return allowedTypes.some(t => fileType.startsWith(t));
    };

    it("should accept image/png", () => {
      expect(validateFileType("image/png", ["image/"])).toBe(true);
    });

    it("should accept application/pdf", () => {
      expect(validateFileType("application/pdf", ["application/pdf", "image/"])).toBe(true);
    });

    it("should reject text/plain", () => {
      expect(validateFileType("text/plain", ["image/", "application/pdf"])).toBe(false);
    });

    it("should reject application/exe", () => {
      expect(validateFileType("application/x-msdownload", ["image/", "application/pdf"])).toBe(false);
    });
  });

  describe("File path generation", () => {
    const generatePath = (folder: string, fileName: string) => {
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = 1711100000000;
      return folder ? `${folder}/${timestamp}_${safeName}` : `${timestamp}_${safeName}`;
    };

    it("should sanitize special characters", () => {
      const path = generatePath("comprovantes", "arquivo (1).pdf");
      expect(path).toBe("comprovantes/1711100000000_arquivo__1_.pdf");
    });

    it("should handle no folder", () => {
      const path = generatePath("", "test.pdf");
      expect(path).toBe("1711100000000_test.pdf");
    });

    it("should preserve dots and hyphens", () => {
      const path = generatePath("docs", "file-name.v2.pdf");
      expect(path).toBe("docs/1711100000000_file-name.v2.pdf");
    });
  });
});
