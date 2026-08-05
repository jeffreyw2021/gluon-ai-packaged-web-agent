/// <reference types="node" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When building for GitHub Pages the base path is the repo name.
// During local dev (VITE_BASE_PATH not set) it defaults to '/' so
// HashRouter works without any path prefix.
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  plugins: [react()],
  base,
});
