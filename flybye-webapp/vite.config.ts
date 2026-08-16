import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // we register manually so we can guard against iframes
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "FlyBye",
        short_name: "FlyBye",
        description: "Professional networking at your terminal.",
        theme_color: "#0a1225",
        background_color: "#0a1225",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/placeholder.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/placeholder.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Don't precache huge image bundles
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // OSM raster tiles — long-lived, immutable
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*\.png$/,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Edge function: airport-pois — cache responses for 1 day
            urlPattern: /\/functions\/v1\/airport-pois/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "airport-pois",
              expiration: { maxEntries: 80, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Avatar / profile images
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 200, maxAgeSeconds: 14 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
