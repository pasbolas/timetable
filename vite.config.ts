import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true
      },
      includeAssets: ["apple-touch-icon.png", "favicon-32x32.png", "favicon-48x48.png", "icon-maskable-512.png"],
      manifest: {
        name: "MyTimetable - University Schedule",
        short_name: "Timetable",
        description: "Mobile-first PWA for university course schedules and lectures",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/scientia-eu-v4-api-(d4-01|d1-03)\.azurewebsites\.net\/api\/Public\/CategoryTypes\/Categories\/Events\/Filter\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "timetable-events-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 2 // 2 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/scientia-eu-v4-api-(d4-01|d1-03)\.azurewebsites\.net\/api\/Public\/CategoryTypes\/.*\/Categories\/FilterWithCache\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "timetable-search-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      }
    })
  ]
});
