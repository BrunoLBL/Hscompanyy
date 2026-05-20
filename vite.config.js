import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,        // Porta fixa para o servidor de desenvolvimento
    strictPort: true,  // Não tenta outra porta se 3000 estiver ocupada
    open: true,        // Abre o navegador automaticamente ao iniciar
    host: true,        // Permite acesso pela rede local (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
  },
});
