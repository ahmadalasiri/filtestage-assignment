/* eslint-env node */
/* global process */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    origin: "http://0.0.0.0:3000",
    port: process.env.PORT,
  },
});
