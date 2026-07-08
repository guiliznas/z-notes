import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "src/test/react-native-mock.tsx"),
      "expo-secure-store": path.resolve(__dirname, "src/test/expo-secure-store-mock.ts"),
      "expo-status-bar": path.resolve(__dirname, "src/test/expo-status-bar-mock.ts"),
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "src/test/async-storage-mock.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/api/http.ts",
        "src/lib/storage.ts",
        "App.tsx",
        "index.ts",
      ],
    },
  },
});
