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
        filename: "bundle.html", // will be placed in client/dist/
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

      // ✅ KEY FIX: split heavy deps out of the main chunk
      rollupOptions: {
        output: {
          manualChunks: {
            // Leaflet is your biggest offender
            leaflet: ["leaflet", "leaflet.markercluster"],

            // Common “big-ish” dashboard deps
            reactVendor: ["react", "react-dom", "react-router-dom"],

            // UI libs (Radix shows up heavily in your treemap)
            radix: [
              "@radix-ui/react-dialog",
              "@radix-ui/react-select",
              "@radix-ui/react-slider",
              "@radix-ui/react-tabs",
              "@radix-ui/react-popover",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-switch",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-progress",
            ],

            // Data helpers that can add up
            date: ["date-fns"],
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
