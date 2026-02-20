import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig(async ({ mode }) => {
  const plugins = [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
  ];

  // Only load Replit-only dev plugins when running on Replit + not production
  if (mode !== "production" && process.env.REPL_ID !== undefined) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    plugins.push(cartographer(), devBanner());
  }

  // ✅ Bundle analyzer (only when you ask for it)
  // Run: npm run build -- --mode analyze
  if (mode === "analyze") {
    const { visualizer } = await import("rollup-plugin-visualizer");
    plugins.push(
      visualizer({
        filename: "bundle.html", // emitted into client/dist/
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
        emitFile: true, // guarantees file generation
      }),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    css: {
      postcss: {
        plugins: [],
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: "dist",
      emptyOutDir: true,

      // ✅ REAL FIX: function-based chunking (reliable with custom root / monorepo layouts)
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 🗺️ Leaflet + markercluster (biggest offender)
            if (id.includes("leaflet") || id.includes("markercluster")) {
              return "leaflet";
            }

            // ⚛️ React core + router
            if (
              id.includes("react-dom") ||
              id.includes("react-router-dom") ||
              id.includes("/react/") ||
              id.includes("\\react\\")
            ) {
              return "react-vendor";
            }

            // 🎛️ Radix UI
            if (id.includes("@radix-ui")) {
              return "radix";
            }

            // 📅 date-fns
            if (id.includes("date-fns")) {
              return "date-fns";
            }

            // 🧩 (optional) tanstack/query libs (uncomment if you want it split too)
            // if (id.includes("@tanstack")) return "tanstack";
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
