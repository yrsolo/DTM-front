import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const buildBase = process.env.DTM_WEB_BUILD_BASE?.trim() || "/";

export default defineConfig({
  base: buildBase,
  plugins: [react()],
  resolve: {
    alias: {
      "@dtm/workbench-inspector": path.resolve(__dirname, "../../packages/workbench-inspector/src/public.ts"),
    },
  },
  server: {
    port: 5173
  }
});
