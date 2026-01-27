import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: resolve("./node_modules/react"),
      "react-dom": resolve("./node_modules/react-dom"),
      "react-dom/client": resolve("./node_modules/react-dom/client")
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom"]
  }
});
