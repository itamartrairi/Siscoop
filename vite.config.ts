import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // A configuração anterior forçava jspdf, xlsx e recharts para chunks
          // nomeados. Como as views eram todas importadas estaticamente, esses
          // chunks acabavam no modulepreload do index.html e eram baixados na
          // tela de login, mesmo por quem nunca abre um relatório.
          //
          // Agora que as views entram por import() dinâmico, o Rollup separa
          // essas libs sozinho, no chunk da view que realmente as usa. Aqui só
          // isolamos o que é usado desde o primeiro render, para que o cache do
          // navegador sobreviva a deploys que só mexem no código da aplicação.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/firebase/') || id.includes('@firebase')) return 'firebase-vendor';
            if (id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor';
          },
        },
      },
    },
  };
});
