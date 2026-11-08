import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sanitizeAccessibilitySettings,
  getInitialAccessibilitySettings,
  defaultSettings,
  ACCESSIBILITY_STORAGE_KEY,
} from '../accessibilityHelpers';

describe('defaultSettings', () => {
  it('has fontSize of 100', () => {
    expect(defaultSettings.fontSize).toBe(100);
  });

  it('has lineSpacing of 1.5', () => {
    expect(defaultSettings.lineSpacing).toBe(1.5);
  });

  it('has letterSpacing of 0', () => {
    expect(defaultSettings.letterSpacing).toBe(0);
  });

  it('has colorBlindMode of none', () => {
    expect(defaultSettings.colorBlindMode).toBe('none');
  });

  it('has focusHighlight enabled by default', () => {
    expect(defaultSettings.focusHighlight).toBe(true);
  });

  it('has keyboardNavigation enabled by default', () => {
    expect(defaultSettings.keyboardNavigation).toBe(true);
  });

  it('has highContrast disabled by default', () => {
    expect(defaultSettings.highContrast).toBe(false);
  });
});

describe('ACCESSIBILITY_STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof ACCESSIBILITY_STORAGE_KEY).toBe('string');
    expect(ACCESSIBILITY_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

describe('sanitizeAccessibilitySettings', () => {
  describe('null / non-object input', () => {
    it('returns all defaults for null', () => {
      expect(sanitizeAccessibilitySettings(null)).toEqual(defaultSettings);
    });

    it('returns all defaults for undefined', () => {
      expect(sanitizeAccessibilitySettings(undefined)).toEqual(defaultSettings);
    });

    it('returns all defaults for a string', () => {
      expect(sanitizeAccessibilitySettings('some string')).toEqual(defaultSettings);
    });

    it('returns all defaults for a number', () => {
      expect(sanitizeAccessibilitySettings(42)).toEqual(defaultSettings);
    });

    it('returns all defaults for an empty object', () => {
      expect(sanitizeAccessibilitySettings({})).toEqual(defaultSettings);
    });
  });

  describe('fontSize clamping (80–150)', () => {
    it('accepts fontSize within range', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: 100 }).fontSize).toBe(100);
    });

    it('clamps fontSize below 80 to 80', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: 50 }).fontSize).toBe(80);
    });

    it('clamps fontSize above 150 to 150', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: 200 }).fontSize).toBe(150);
    });

    it('accepts fontSize exactly at 80', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: 80 }).fontSize).toBe(80);
    });

    it('accepts fontSize exactly at 150', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: 150 }).fontSize).toBe(150);
    });

    it('falls back to default for NaN fontSize', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: NaN }).fontSize).toBe(defaultSettings.fontSize);
    });

    it('falls back to default for non-numeric fontSize', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: 'big' }).fontSize).toBe(defaultSettings.fontSize);
    });

    it('parses fontSize from numeric string', () => {
      expect(sanitizeAccessibilitySettings({ fontSize: '120' }).fontSize).toBe(120);
    });
  });

  describe('lineSpacing clamping (1–2.5)', () => {
    it('accepts lineSpacing within range', () => {
      expect(sanitizeAccessibilitySettings({ lineSpacing: 1.5 }).lineSpacing).toBe(1.5);
    });

    it('clamps lineSpacing below 1 to 1', () => {
      expect(sanitizeAccessibilitySettings({ lineSpacing: 0.5 }).lineSpacing).toBe(1);
    });

    it('clamps lineSpacing above 2.5 to 2.5', () => {
      expect(sanitizeAccessibilitySettings({ lineSpacing: 3 }).lineSpacing).toBe(2.5);
    });

    it('accepts lineSpacing exactly at 1', () => {
      expect(sanitizeAccessibilitySettings({ lineSpacing: 1 }).lineSpacing).toBe(1);
    });

    it('accepts lineSpacing exactly at 2.5', () => {
      expect(sanitizeAccessibilitySettings({ lineSpacing: 2.5 }).lineSpacing).toBe(2.5);
    });
  });

  describe('letterSpacing clamping (0–0.2)', () => {
    it('accepts letterSpacing within range', () => {
      expect(sanitizeAccessibilitySettings({ letterSpacing: 0.1 }).letterSpacing).toBe(0.1);
    });

    it('clamps letterSpacing below 0 to 0', () => {
      expect(sanitizeAccessibilitySettings({ letterSpacing: -0.1 }).letterSpacing).toBe(0);
    });

    it('clamps letterSpacing above 0.2 to 0.2', () => {
      expect(sanitizeAccessibilitySettings({ letterSpacing: 0.5 }).letterSpacing).toBe(0.2);
    });

    it('accepts letterSpacing exactly at 0', () => {
      expect(sanitizeAccessibilitySettings({ letterSpacing: 0 }).letterSpacing).toBe(0);
    });

    it('accepts letterSpacing exactly at 0.2', () => {
      expect(sanitizeAccessibilitySettings({ letterSpacing: 0.2 }).letterSpacing).toBe(0.2);
    });
  });

  describe('boolean coercion', () => {
    it('accepts true boolean for highContrast', () => {
      expect(sanitizeAccessibilitySettings({ highContrast: true }).highContrast).toBe(true);
    });

    it('accepts false boolean for highContrast', () => {
      expect(sanitizeAccessibilitySettings({ highContrast: false }).highContrast).toBe(false);
    });

    it('coerces string "true" to true', () => {
      expect(sanitizeAccessibilitySettings({ highContrast: 'true' }).highContrast).toBe(true);
    });

    it('coerces string "false" to false', () => {
      expect(sanitizeAccessibilitySettings({ focusHighlight: 'false' }).focusHighlight).toBe(false);
    });

    it('falls back to default for invalid boolean (number)', () => {
      expect(sanitizeAccessibilitySettings({ keyboardNavigation: 1 }).keyboardNavigation).toBe(
        defaultSettings.keyboardNavigation
      );
    });

    it('falls back to default for invalid boolean (null)', () => {
      expect(sanitizeAccessibilitySettings({ reducedMotion: null }).reducedMotion).toBe(
        defaultSettings.reducedMotion
      );
    });
  });

  describe('colorBlindMode validation', () => {
    it('accepts "none"', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: 'none' }).colorBlindMode).toBe('none');
    });

    it('accepts "protanopia"', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: 'protanopia' }).colorBlindMode).toBe('protanopia');
    });

    it('accepts "deuteranopia"', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: 'deuteranopia' }).colorBlindMode).toBe('deuteranopia');
    });

    it('accepts "tritanopia"', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: 'tritanopia' }).colorBlindMode).toBe('tritanopia');
    });

    it('falls back to "none" for invalid colorBlindMode string', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: 'invalid' }).colorBlindMode).toBe('none');
    });

    it('falls back to "none" for numeric colorBlindMode', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: 1 }).colorBlindMode).toBe('none');
    });

    it('falls back to "none" for null colorBlindMode', () => {
      expect(sanitizeAccessibilitySettings({ colorBlindMode: null }).colorBlindMode).toBe('none');
    });
  });

  describe('output completeness', () => {
    it('always returns all required keys', () => {
      const result = sanitizeAccessibilitySettings({});
      const expected: (keyof typeof defaultSettings)[] = [
        'fontSize', 'highContrast', 'reducedMotion', 'largePointer',
        'focusHighlight', 'screenReaderMode', 'dyslexiaFont',
        'lineSpacing', 'letterSpacing', 'colorBlindMode',
        'textToSpeech', 'keyboardNavigation',
      ];
      expected.forEach(key => {
        expect(result).toHaveProperty(key);
      });
    });

    it('merges valid fields and uses defaults for missing ones', () => {
      const result = sanitizeAccessibilitySettings({ fontSize: 120, highContrast: true });
      expect(result.fontSize).toBe(120);
      expect(result.highContrast).toBe(true);
      expect(result.colorBlindMode).toBe(defaultSettings.colorBlindMode);
      expect(result.lineSpacing).toBe(defaultSettings.lineSpacing);
    });

    it('does not mutate the input object', () => {
      const input = { fontSize: 200 };
      sanitizeAccessibilitySettings(input);
      expect((input as { fontSize: number }).fontSize).toBe(200);
    });
  });
});

describe('getInitialAccessibilitySettings', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns defaultSettings when localStorage is empty', () => {
    expect(getInitialAccessibilitySettings()).toEqual(defaultSettings);
  });

  it('returns parsed + sanitized settings from localStorage', () => {
    const stored = { fontSize: 120, highContrast: false, colorBlindMode: 'none' };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
    const result = getInitialAccessibilitySettings();
    expect(result.fontSize).toBe(120);
  });

  it('returns defaultSettings for invalid JSON in localStorage', () => {
    localStorageMock.getItem.mockReturnValue('{not valid json}');
    expect(getInitialAccessibilitySettings()).toEqual(defaultSettings);
  });

  it('auto-resets highContrast to false on load', () => {
    const stored = { highContrast: true };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
    const result = getInitialAccessibilitySettings();
    expect(result.highContrast).toBe(false);
  });

  it('auto-resets reducedMotion to false on load', () => {
    const stored = { reducedMotion: true };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
    const result = getInitialAccessibilitySettings();
    expect(result.reducedMotion).toBe(false);
  });

  it('auto-resets colorBlindMode to none on load when set', () => {
    const stored = { colorBlindMode: 'protanopia' };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
    const result = getInitialAccessibilitySettings();
    expect(result.colorBlindMode).toBe('none');
  });

  it('persists the recovered settings back to localStorage', () => {
    const stored = { highContrast: true };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
    getInitialAccessibilitySettings();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      ACCESSIBILITY_STORAGE_KEY,
      expect.stringContaining('"highContrast":false')
    );
  });

  it('does not write to localStorage when no visual settings need recovery', () => {
    const stored = { fontSize: 110 };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
    getInitialAccessibilitySettings();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});
