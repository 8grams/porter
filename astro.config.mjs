// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  session: {
    driver: "fs",
    options: {
      base: "./data/session",
    },
  },
  server: {
    host: true,
  },
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
});
