import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      TOKEN_ENCRYPTION_KEY:
        "079cb00742fdaccaa85ec71ed1139131e0d84208f3814da95a10fc18770fd970",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
});
