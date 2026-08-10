import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "vitest.react-native.stub.ts"),
      "expo-router": path.resolve(__dirname, "vitest.expo-router.stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
