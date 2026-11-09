import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/index.ts"]
    }
  },
  resolve: {
    alias: {
      "@neerajkr1810/instaconnect-core": path.resolve(__dirname, "./packages/core/src/index.ts"),
      "@neerajkr1810/instaconnect-react": path.resolve(__dirname, "./packages/react/src/index.ts"),
      "@neerajkr1810/instaconnect-next/server": path.resolve(__dirname, "./packages/next/src/server/index.ts"),
      "@neerajkr1810/instaconnect-next/client": path.resolve(__dirname, "./packages/next/src/client/index.ts"),
      "@neerajkr1810/instaconnect-next": path.resolve(__dirname, "./packages/next/src/index.ts"),
      "@instaconnect/core": path.resolve(__dirname, "./packages/core/src/index.ts"),
      "@instaconnect/react": path.resolve(__dirname, "./packages/react/src/index.ts"),
      "@instaconnect/next/server": path.resolve(__dirname, "./packages/next/src/server/index.ts"),
      "@instaconnect/next/client": path.resolve(__dirname, "./packages/next/src/client/index.ts"),
      "@instaconnect/next": path.resolve(__dirname, "./packages/next/src/index.ts")
    }
  }
});

