import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const workspaceRoot = resolve(__dirname, "../..");
  Object.assign(
    process.env,
    loadEnv(mode, workspaceRoot, ["AISTU_", "DEEPSEEK_"]),
  );

  return {
    main: {
      build: {
        externalizeDeps: {
          exclude: [
            "@aistu/contracts",
            "@aistu/knowledge-runtime",
            "@aistu/lesson-arrayqueue-representation",
            "@aistu/lesson-arraystack-insertion",
            "@aistu/lesson-call-stack",
            "@aistu/lesson-cs408-core-visualizations",
            "@aistu/lesson-dualarraydeque-balance",
            "@aistu/tutor-runtime",
            "@aistu/ui",
            "@aistu/visualization-runtime",
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
          exclude: ["@aistu/contracts", "zod"],
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
