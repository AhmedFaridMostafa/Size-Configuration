import { resolve } from "path";
/** @type {import('vite').UserConfig} */
export default {
  root: resolve(__dirname, "src"),
  build: {
    outDir: "../dist",
  },
  server: {
    port: 8080,
  },
};
