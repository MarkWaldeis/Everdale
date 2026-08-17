import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs so the world works on GitHub Pages and any static host.
  base: "./",
  server: {
    watch: {
      // Large binary source assets do not need hot-module reloading and can be
      // temporarily locked while the user copies new models into the folder.
      ignored: ["**/*.glb", "**/*.gltf", "**/temp_animations/**"],
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
});
