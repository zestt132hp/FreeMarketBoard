import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, "client"),
  build: {
    outDir: path.join(__dirname, "dist"),  // Исправленный путь без опечатки
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, "client/index.html")
    }
  },
  resolve: {
    alias: {
      "@": path.join(__dirname, "client/src"),
      "@shared": path.join(__dirname, "shared"),
      "@assets": path.join(__dirname, "attached_assets")
    }
  },
  server: {
    host: true,  // Для работы в Docker
    port: 3000,  // Порт для dev-сервера
    strictPort: true
  }
});