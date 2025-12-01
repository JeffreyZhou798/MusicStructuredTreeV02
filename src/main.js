import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/main.css';

// Create Vue app
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration.scope);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// Set TensorFlow.js backend preference
async function initTensorFlow() {
  try {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    
    // Prefer WebGL backend
    if (tf.getBackend() !== 'webgl') {
      try {
        await tf.setBackend('webgl');
      } catch (e) {
        console.log('WebGL not available, using CPU backend');
      }
    }
    
    console.log('TensorFlow.js backend:', tf.getBackend());
  } catch (error) {
    console.warn('TensorFlow.js initialization:', error.message);
  }
}

// Initialize TensorFlow.js in background
initTensorFlow();
