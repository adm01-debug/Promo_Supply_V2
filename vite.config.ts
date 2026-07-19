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
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
    rollupOptions: {
      onwarn: handleRollupWarning,
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@radix-ui")) return "vendor-ui";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("jspdf")) return "vendor-pdf";
            return "vendor";
          }
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
