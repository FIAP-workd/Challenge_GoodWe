import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // O Pages serve este projeto em uma subpasta; o desenvolvimento local mantém /.
  base: mode === "github-pages" ? "/Challenge_GoodWe/" : "/",
  plugins: [react()],
}));
