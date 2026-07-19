import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/**
 * Translations live in separate JSON files under /public/locales/<lng>/translation.json.
 * Vite resolves these as static imports so they are tree-shaken and bundled efficiently.
 * Adding a new locale: create the JSON file and add an entry to LOCALE_MODULES below.
 */
import ptTranslation from "@/locales/pt/translation.json";
import enTranslation from "@/locales/en/translation.json";
import esTranslation from "@/locales/es/translation.json";

const resources = {
  pt: { translation: ptTranslation },
  en: { translation: enTranslation },
  es: { translation: esTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['pt', 'en', 'es'],
    fallbackLng: "pt",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
