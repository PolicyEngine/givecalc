import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ["plotly.js", "react-plotly.js"],
          vendor: ["react", "react-dom", "@tanstack/react-query", "axios"],
        },
      },
    },
    chunkSizeWarningLimit: 1500, // Plotly is large but acceptable
  },
});
