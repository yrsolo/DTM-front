import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const buildBase = process.env.DTM_WEB_BUILD_BASE?.trim() || "/";

export default defineConfig({
  base: buildBase,
  plugins: [react()],
  server: {
    port: 5173
  }
});
