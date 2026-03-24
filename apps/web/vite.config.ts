import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const buildBase = env.DTM_WEB_BUILD_BASE?.trim() || "/";
  return {
    base: buildBase,
    plugins: [react()],
    resolve: {
      alias: {
        "@dtm/workbench-inspector": path.resolve(__dirname, "../../packages/workbench-inspector/src/public.ts"),
      },
    },
    server: {
      port: 5173,
    },
  };
});
