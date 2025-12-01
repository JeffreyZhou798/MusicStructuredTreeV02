import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia'],
          'tensorflow': ['@tensorflow/tfjs'],
          'magenta': ['@magenta/music'],
          'audio': ['tone', 'meyda'],
          'visualization': ['opensheetmusicdisplay']
        }
      }
    },
    
    chunkSizeWarningLimit: 2000
  },
  
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@magenta/music',
      '@tensorflow-models/knn-classifier'
    ]
  },
  
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});
