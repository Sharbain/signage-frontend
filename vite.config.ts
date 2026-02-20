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
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ];

  // 🔎 DEBUG: prove which mode Vite is using and where it's running from
  console.log("\n================ VITE CONFIG DEBUG ================");
  console.log("mode:", mode);
  console.log("cwd:", process.cwd());
  console.log("config dir:", import.meta.dirname);
  console.log("ANALYZE env:", process.env.ANALYZE);
  console.log("===================================================\n");

  // ✅ Enable analyzer in analyze mode OR when ANALYZE=true
  if (mode === "analyze" || process.env.ANALYZE === "true") {
    console.log("✅ Analyzer enabled. Writing bundle.html...");
    const { visualizer } = await import("rollup-plugin-visualizer");

    plugins.push(
      visualizer({
        // FORCE OUTPUT: write to repo root so you can find it
        filename: path.resolve(import.meta.dirname, "bundle.html"),
        open: false, // we'll open it manually
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
    );
  } else {
    console.log("❌ Analyzer NOT enabled.");
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
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      fs: { strict: true, deny: ["**/.*"] },
    },
  };
});
