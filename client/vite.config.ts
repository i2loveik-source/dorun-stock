import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 4401,
    proxy: {
      "/api": "http://localhost:4400",
      "/socket.io": {
        target: "http://localhost:4400",
        ws: true,
      },
    },
  },
});
