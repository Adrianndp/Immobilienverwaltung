import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // The router plugin must come before react(): it generates src/routeTree.gen.ts from src/routes/.
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  // Resolves the @/ alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  server: {
    host: true,
    proxy: {
      "/api": "http://backend:8000",
      "/static": "http://backend:8000",
    },
  },
});
