import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devPort = Number(process.env.SUPERSUBSET_DEV_APP_PORT ?? 3000);

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    strictPort: Boolean(process.env.SUPERSUBSET_DEV_APP_PORT),
  },
});
