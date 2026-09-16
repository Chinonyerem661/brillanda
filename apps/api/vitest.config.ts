import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Points the app at the brillanda_test database, which is migrated and emptied once per run.
    setupFiles: ["tests/setup/env.ts"],
    globalSetup: ["tests/setup/database.ts"],
  },
});
