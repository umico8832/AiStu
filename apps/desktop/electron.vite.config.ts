import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const workspaceRoot = resolve(__dirname, "../..");
  Object.assign(
    process.env,
    loadEnv(mode, workspaceRoot, ["KALEIDOSCOPE_", "DEEPSEEK_"]),
  );

  return {
    main: {
      build: {
        externalizeDeps: {
          exclude: [
            "@kaleidoscope/contracts",
            "@kaleidoscope/knowledge-runtime",
            "@kaleidoscope/lesson-arrayqueue-representation",
            "@kaleidoscope/lesson-arraystack-insertion",
            "@kaleidoscope/lesson-call-stack",
            "@kaleidoscope/lesson-cs408-core-visualizations",
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
  };
});
