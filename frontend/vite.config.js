import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const backendBaseUrl = new URL(
        env.VITE_BACKEND_BASE_URL || 'http://localhost/university-portfolio/backend/public'
    );
    const backendOrigin = `${backendBaseUrl.protocol}//${backendBaseUrl.host}`;
    const backendPath = backendBaseUrl.pathname.replace(/\/$/, '');

    return {
        base: env.VITE_APP_BASE || '/',
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        plugins: [
            react(),
            tailwindcss(),
        ],
        build: {
            outDir: 'dist',
            emptyOutDir: true,
        },
        server: {
            proxy: {
                '/jostum-api': {
                    target: 'https://jostumservices.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/jostum-api/, '/api'),
                },
                '/api': {
                    target: backendOrigin,
                    changeOrigin: true,
                    rewrite: (path) => `${backendPath}${path}`,
                },
                '/uploads': {
                    target: backendOrigin,
                    changeOrigin: true,
                    rewrite: (path) => `${backendPath}${path}`,
                },
                '/backend': {
                    target: backendOrigin,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/backend\/public/, backendPath),
                },
            },
            watch: {
                ignored: [
                    '**/.git/**',
                    '**/dist/**',
                    '**/node_modules/**',
                ],
            },
        },
    };
});
