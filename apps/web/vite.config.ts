import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin API calls in development; no CORS setup needed.
    proxy: { "/api": "http://localhost:4000" },
  },
});
