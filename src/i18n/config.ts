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

/**
 * O documento e declarado como pt-BR em index.html, que e o padrao correto para
 * quem chega sem JS (fallbackLng 'pt'). O problema: trocar o idioma na UI nao
 * mexia nesse atributo, entao leitor de tela continuava lendo ingles/espanhol com
 * a pronuncia do portugues (WCAG 3.1.2, "Language of Parts"). A sincronizacao
 * abaixo e a unica ponte entre o idioma escolhido no i18n e o documento.
 */
const LANG_DO_DOCUMENTO: Record<string, string> = { pt: 'pt-BR', en: 'en', es: 'es' };

export const sincronizarIdiomaDoDocumento = (lng?: string): void => {
  if (typeof document === 'undefined') return;
  const base = (lng ?? '').split('-')[0].toLowerCase();
  document.documentElement.lang = LANG_DO_DOCUMENTO[base] ?? LANG_DO_DOCUMENTO.pt;
};

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

i18n.on('languageChanged', (lng) => sincronizarIdiomaDoDocumento(lng));
sincronizarIdiomaDoDocumento(i18n.resolvedLanguage ?? i18n.language);

export default i18n;
