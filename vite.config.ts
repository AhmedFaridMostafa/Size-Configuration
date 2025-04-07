import { resolve } from "path";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        logger: {
          warn: () => {}, // Silently ignore warnings
        },
      },
    },
  },
  root: resolve(__dirname, "src"),

  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          bootstrap: ["bootstrap"],
          agGrid: ["ag-grid-community"],
          xlsx: ["xlsx"],
          vendor: ["@popperjs/core"],
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Increase limit
  },
  server: {
    port: 8080,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
