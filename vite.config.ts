import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 5173,
    host: "0.0.0.0",
    // In production the Cloudflare Worker (worker.ts) proxies /api/replicate
    // to the Replicate API. The worker doesn't run under `vite dev`, so we
    // replicate that proxy here to avoid 404s during local development.
    proxy: {
      "/api/replicate": {
        target: "https://api.replicate.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/replicate/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  publicDir: "public",
});
