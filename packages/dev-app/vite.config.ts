import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devPort = Number(process.env.SUPERSUBSET_DEV_APP_PORT ?? 3000);

function chunkDevAppBuild(id: string) {
  const normalizedId = id.replace(/\\/g, '/');

  if (
    normalizedId.includes('/node_modules/react/') ||
    normalizedId.includes('/node_modules/react-dom/') ||
    normalizedId.includes('/node_modules/scheduler/')
  ) {
    return 'react-vendor';
  }

  if (normalizedId.includes('/packages/charts-echarts/dist/')) {
    return 'charts-vendor';
  }

  if (
    normalizedId.includes('/node_modules/echarts/') ||
    normalizedId.includes('/node_modules/zrender/')
  ) {
    return 'charts-vendor';
  }

  if (normalizedId.includes('/packages/designer/dist/')) {
    return 'supersubset-designer';
  }

  if (normalizedId.includes('/node_modules/@puckeditor/')) {
    return 'puck-vendor';
  }

  if (normalizedId.includes('/node_modules/@dnd-kit/')) {
    return 'dnd-vendor';
  }

  if (normalizedId.includes('/node_modules/@emotion/')) {
    return 'emotion-vendor';
  }

  if (normalizedId.includes('/packages/runtime/dist/')) {
    return 'runtime-vendor';
  }

  if (
    normalizedId.includes('/packages/schema/dist/') ||
    normalizedId.includes('/packages/theme/dist/') ||
    normalizedId.includes('/packages/data-model/dist/') ||
    normalizedId.includes('/packages/adapter-json/dist/')
  ) {
    return 'supersubset-support';
  }

  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: chunkDevAppBuild,
      },
    },
  },
  server: {
    port: devPort,
    strictPort: Boolean(process.env.SUPERSUBSET_DEV_APP_PORT),
  },
});
