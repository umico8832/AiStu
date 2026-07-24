import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: [
          "@kaleidoscope/contracts",
          "@kaleidoscope/knowledge-runtime",
          "@kaleidoscope/lesson-arrayqueue-representation",
          "@kaleidoscope/lesson-arraystack-insertion",
          "@kaleidoscope/lesson-call-stack",
          "@kaleidoscope/lesson-dualarraydeque-balance",
          "@kaleidoscope/tutor-runtime",
          "@kaleidoscope/ui",
          "@kaleidoscope/visualization-runtime",
        ],
      },
      rollupOptions: {
        external: ["electron"],
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: {
        exclude: ["@kaleidoscope/contracts", "zod"],
      },
      rollupOptions: {
        external: ["electron"],
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
  },
});
