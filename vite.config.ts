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
        emitFile: true,
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
      postcss: { plugins: [] },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: "dist",
      emptyOutDir: true,

      // ✅ Vercel-safe chunk splitting (works across Vite versions)
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 1) Leaflet (biggest offender) — isolate hard
            if (id.includes("leaflet") || id.includes("markercluster")) {
              return "leaflet";
            }

            // 2) React core
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router/") ||
              id.includes("node_modules/react-router-dom/")
            ) {
              return "react-vendor";
            }

            // 3) Radix UI
            if (id.includes("node_modules/@radix-ui/")) {
              return "radix";
            }

            // 4) TanStack Query (if present)
            if (id.includes("node_modules/@tanstack/")) {
              return "tanstack";
            }

            // 5) Everything else in node_modules -> vendor bucket
            if (id.includes("node_modules/")) {
              return "vendor";
            }
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
