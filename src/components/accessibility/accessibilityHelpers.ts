export interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  largePointer: boolean;
  focusHighlight: boolean;
  screenReaderMode: boolean;
  dyslexiaFont: boolean;
  lineSpacing: number;
  letterSpacing: number;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  textToSpeech: boolean;
  keyboardNavigation: boolean;
}

export const defaultSettings: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  largePointer: false,
  focusHighlight: true,
  screenReaderMode: false,
  dyslexiaFont: false,
  lineSpacing: 1.5,
  letterSpacing: 0,
  colorBlindMode: 'none',
  textToSpeech: false,
  keyboardNavigation: true
};

const colorBlindModes: AccessibilitySettings['colorBlindMode'][] = [
  'none',
  'protanopia',
  'deuteranopia',
  'tritanopia',
];

export const ACCESSIBILITY_STORAGE_KEY = 'accessibility-settings';

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const toNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

export const sanitizeAccessibilitySettings = (raw: unknown): AccessibilitySettings => {
  const saved = raw && typeof raw === 'object'
    ? (raw as Partial<AccessibilitySettings>)
    : {};

  const colorBlindMode =
    typeof saved.colorBlindMode === 'string' &&
    colorBlindModes.includes(saved.colorBlindMode as AccessibilitySettings['colorBlindMode'])
      ? (saved.colorBlindMode as AccessibilitySettings['colorBlindMode'])
      : defaultSettings.colorBlindMode;

  return {
    fontSize: toNumber(saved.fontSize, defaultSettings.fontSize, 80, 150),
    highContrast: toBoolean(saved.highContrast, defaultSettings.highContrast),
    reducedMotion: toBoolean(saved.reducedMotion, defaultSettings.reducedMotion),
    largePointer: toBoolean(saved.largePointer, defaultSettings.largePointer),
    focusHighlight: toBoolean(saved.focusHighlight, defaultSettings.focusHighlight),
    screenReaderMode: toBoolean(saved.screenReaderMode, defaultSettings.screenReaderMode),
    dyslexiaFont: toBoolean(saved.dyslexiaFont, defaultSettings.dyslexiaFont),
    lineSpacing: toNumber(saved.lineSpacing, defaultSettings.lineSpacing, 1, 2.5),
    letterSpacing: toNumber(saved.letterSpacing, defaultSettings.letterSpacing, 0, 0.2),
    colorBlindMode,
    textToSpeech: toBoolean(saved.textToSpeech, defaultSettings.textToSpeech),
    keyboardNavigation: toBoolean(saved.keyboardNavigation, defaultSettings.keyboardNavigation),
  };
};

const shouldAutoRecoverVisualSettings = (settings: AccessibilitySettings): boolean => {
  return (
    settings.highContrast ||
    settings.colorBlindMode !== 'none' ||
    settings.reducedMotion
  );
};

export const getInitialAccessibilitySettings = (): AccessibilitySettings => {
  const savedSettings = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);

  if (!savedSettings) return defaultSettings;

  try {
    const parsed = sanitizeAccessibilitySettings(JSON.parse(savedSettings));

    if (shouldAutoRecoverVisualSettings(parsed)) {
      const recoveredSettings: AccessibilitySettings = {
        ...parsed,
        highContrast: false,
        reducedMotion: false,
        colorBlindMode: 'none',
      };

      localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(recoveredSettings));
      return recoveredSettings;
    }

    return parsed;
  } catch {
    return defaultSettings;
  }
};
