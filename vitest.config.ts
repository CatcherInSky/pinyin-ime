import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest 配置：DOM 环境用于键盘与受控输入测试。
 *
 * @returns Vitest 用户配置
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
