/* eslint-env node */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    origin: "http://0.0.0.0:3000",
    port: 3000,
    allowedHosts: ["filestage.ahmadalasiri.info"],
  },
});
