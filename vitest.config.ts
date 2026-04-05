import { defineConfig } from "vitest/config";

/**
 * Vitest 配置：DOM 环境用于词典与引擎测试。
 *
 * @returns Vitest 用户配置
 */
export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
