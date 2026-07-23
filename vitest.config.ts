import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: [
      "packages/**/*.test.{ts,tsx}",
      "apps/desktop/src/**/*.test.{ts,tsx}",
    ],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
