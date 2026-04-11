import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@tiptap/') || id.includes('/node_modules/prosemirror-')) {
            return 'puck-rich-text';
          }

          if (id.includes('/node_modules/@dnd-kit/')) {
            return 'puck-dnd';
          }

          if (
            id.includes('/node_modules/@radix-ui/') ||
            id.includes('/node_modules/@floating-ui/') ||
            id.includes('/node_modules/@tanstack/react-virtual/')
          ) {
            return 'puck-ui';
          }

          if (id.includes('/node_modules/@puckeditor/core/')) {
            return 'puck-core';
          }

          if (id.includes('/node_modules/echarts/charts/')) {
            return 'echarts-series';
          }

          if (id.includes('/node_modules/echarts/components/')) {
            return 'echarts-components';
          }

          if (id.includes('/node_modules/echarts/renderers/')) {
            return 'echarts-renderers';
          }

          if (id.includes('/node_modules/echarts/core') || id.includes('/node_modules/echarts/lib/core/')) {
            return 'echarts-core';
          }

          if (id.includes('/node_modules/echarts/')) {
            return 'echarts-core';
          }

          if (id.includes('/node_modules/zrender/')) {
            return 'zrender-core';
          }

          if (id.includes('/packages/designer/dist/')) {
            return 'supersubset-designer';
          }

          if (id.includes('/packages/charts-echarts/dist/')) {
            return 'supersubset-charts';
          }

          if (id.includes('/node_modules/sql.js/')) {
            return 'sqljs-runtime';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 3002,
  },
});