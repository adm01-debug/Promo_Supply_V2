import { defineConfig, type Rollup } from "vite";

type RollupLog = Rollup.RollupLog;
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";


const handleRollupWarning = (
  warning: RollupLog,
  warn: (warning: RollupLog | string | (() => RollupLog | string)) => void,
) => {
  const isKnownSupabaseWrapperWarning =
    warning.code === "MISSING_EXPORT" &&
    typeof warning.exporter === "string" &&
    warning.exporter.includes("@supabase/supabase-js/dist/module/index.js") &&
    typeof warning.id === "string" &&
    warning.id.includes("@supabase/supabase-js/dist/esm/wrapper.mjs");

  if (isKnownSupabaseWrapperWarning) return;

  warn(warning);
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "placeholder.svg"],
      manifest: {
        name: "Promo Supply",
        short_name: "Promo Supply",
        description: "Gestão completa de compras, fornecedores e contratos",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        // Expanded to include woff (legacy), json (translation/config), and webp (images)
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,webp,woff,woff2,json}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Static image/font assets — long-lived CacheFirst
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-cache",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // Supabase REST (transactional) — NetworkFirst, short TTL
          {
            urlPattern: /^https:\/\/apuzcrkeqodktmpwobnz\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 5,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          // Supabase Storage (files/images) — CacheFirst, longer TTL
          {
            urlPattern: /^https:\/\/apuzcrkeqodktmpwobnz\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          // Supabase Edge Functions — NetworkOnly (never cache mutations)
          {
            urlPattern: /^https:\/\/apuzcrkeqodktmpwobnz\.supabase\.co\/functions\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          // App shell pages — NetworkFirst with offline fallback to index.html
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    target: "es2020",
    cssMinify: true,
    minify: "esbuild",
    sourcemap: 'hidden',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
    rollupOptions: {
      onwarn: handleRollupWarning,
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // Animation — framer-motion + its private deps (motion-dom, motion-utils)
          if (
            id.includes("framer-motion") ||
            id.includes("motion-dom") ||
            id.includes("motion-utils") ||
            id.includes("motion-v")
          ) return "vendor-motion";

          // Icons
          if (id.includes("lucide-react")) return "vendor-icons";

          // Radix UI + overlay/portal deps that radix depends on (avoids circular chunks)
          if (
            id.includes("@radix-ui") ||
            id.includes("/cmdk/") ||
            id.includes("/vaul/") ||
            id.includes("@floating-ui") ||
            id.includes("react-remove-scroll") ||
            id.includes("react-remove-scroll-bar") ||
            id.includes("react-style-singleton") ||
            id.includes("use-callback-ref") ||
            id.includes("use-sidecar") ||
            id.includes("aria-hidden") ||
            id.includes("get-nonce")
          ) return "vendor-ui";

          // Charts + D3 + recharts transitive deps (lodash, fast-equals, internmap, etc.)
          if (
            id.includes("recharts") ||
            id.includes("d3-") ||
            id.includes("/victory") ||
            id.includes("/lodash") ||
            id.includes("fast-equals") ||
            id.includes("internmap") ||
            id.includes("decimal.js-light") ||
            id.includes("react-smooth")
          ) return "vendor-charts";

          // PDF core — jsPDF + autotable (lightweight, ~200 kB)
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "vendor-pdf";
          // Canvas rendering layer — html2canvas + canvg + Babel/core-js polyfills (~500 kB, lazy-loaded)
          if (
            id.includes("html2canvas") ||
            id.includes("/canvg/") ||
            id.includes("fflate") ||
            id.includes("/pako/") ||
            id.includes("fast-png") ||
            id.includes("iobuffer") ||
            id.includes("stackblur") ||
            id.includes("rgbcolor") ||
            id.includes("svg-pathdata") ||
            id.includes("@babel/runtime") ||
            id.includes("core-js") ||
            id.includes("regenerator-runtime") ||
            id.includes("/raf/") ||
            id.includes("performance-now")
          ) return "vendor-canvas";

          // TanStack query / persister
          if (id.includes("@tanstack")) return "vendor-query";

          // Supabase
          if (id.includes("@supabase") || id.includes("isows")) return "vendor-supabase";

          // Zustand state
          if (id.includes("zustand")) return "vendor-state";

          // Router
          if (id.includes("react-router") || id.includes("@remix-run")) return "vendor-router";

          // Forms & validation
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("/zod/")
          ) return "vendor-forms";

          // i18n
          if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";

          // Date utilities
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "vendor-date";

          // Drag & drop
          if (id.includes("@dnd-kit")) return "vendor-dnd";

          // Markdown pipeline
          if (
            id.includes("react-markdown") ||
            id.includes("/unified/") ||
            id.includes("/remark") ||
            id.includes("/rehype") ||
            id.includes("/micromark") ||
            id.includes("/mdast") ||
            id.includes("/unist") ||
            id.includes("/vfile") ||
            id.includes("hast-") ||
            id.includes("property-information") ||
            id.includes("comma-separated-tokens") ||
            id.includes("space-separated-tokens") ||
            id.includes("html-url-attributes") ||
            id.includes("decode-named-character-reference") ||
            id.includes("trim-lines") ||
            id.includes("bail") ||
            id.includes("extend") ||
            id.includes("is-plain-obj") ||
            id.includes("trough") ||
            id.includes("style-to-object") ||
            id.includes("style-to-js") ||
            id.includes("inline-style-parser") ||
            id.includes("estree-util-is-identifier-name")
          ) return "vendor-markdown";

          // React core (placed after all react-* lib checks so react-router stays in vendor-router)
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "vendor-react";

          // Remaining small libs
          return "vendor";
        },
      },
      treeshake: {
        propertyReadSideEffects: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "zustand",
      "sonner",
      "lucide-react",
    ],
    exclude: ["lovable-tagger"],
  },
}));
