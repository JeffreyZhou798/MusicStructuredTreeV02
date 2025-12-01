/**
 * Model Loader - Handles lazy loading and caching of AI models
 */
import { CacheManager } from './CacheManager';

export class ModelLoader {
  constructor() {
    this.loadedModels = new Map();
    this.loadingPromises = new Map();
    this.modelConfigs = {
      musicvae: {
        name: 'MusicVAE',
        checkpoints: [
          'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small'
        ]
      },
      onsetsFrames: {
        name: 'Onsets and Frames',
        checkpoints: [
          'https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni'
        ]
      }
    };
  }

  /**
   * Load model on demand with caching
   * @param {string} modelName 
   * @param {Function} onProgress 
   * @returns {Promise<any>}
   */
  async loadOnDemand(modelName, onProgress = null) {
    // Return cached model if available
    if (this.loadedModels.has(modelName)) {
      return this.loadedModels.get(modelName);
    }

    // Return existing loading promise if model is being loaded
    if (this.loadingPromises.has(modelName)) {
      return this.loadingPromises.get(modelName);
    }

    // Start loading
    const loadPromise = this.loadModel(modelName, onProgress);
    this.loadingPromises.set(modelName, loadPromise);

    try {
      const model = await loadPromise;
      this.loadedModels.set(modelName, model);
      return model;
    } finally {
      this.loadingPromises.delete(modelName);
    }
  }

  /**
   * Load a specific model
   * @param {string} modelName 
   * @param {Function} onProgress 
   * @returns {Promise<any>}
   */
  async loadModel(modelName, onProgress) {
    const config = this.modelConfigs[modelName];
    if (!config) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    if (onProgress) onProgress(0, `Loading ${config.name}...`);

    // Check IndexedDB cache first
    const cached = await CacheManager.hasModel(modelName);
    if (cached) {
      if (onProgress) onProgress(50, `Loading ${config.name} from cache...`);
    }

    // Load model based on type
    let model;
    try {
      if (modelName === 'musicvae') {
        model = await this.loadMusicVAE(config, onProgress);
      } else if (modelName === 'onsetsFrames') {
        model = await this.loadOnsetsFrames(config, onProgress);
      }
    } catch (error) {
      throw new Error(`Failed to load ${config.name}: ${error.message}`);
    }

    if (onProgress) onProgress(100, `${config.name} loaded`);
    return model;
  }

  /**
   * Load MusicVAE model
   * @param {object} config 
   * @param {Function} onProgress 
   * @returns {Promise<any>}
   */
  async loadMusicVAE(config, onProgress) {
    // Dynamic import of Magenta
    const mm = await import('@magenta/music');
    
    if (onProgress) onProgress(30, 'Initializing MusicVAE...');
    
    const model = new mm.MusicVAE(config.checkpoints[0]);
    await model.initialize();
    
    return model;
  }

  /**
   * Load Onsets and Frames model
   * @param {object} config 
   * @param {Function} onProgress 
   * @returns {Promise<any>}
   */
  async loadOnsetsFrames(config, onProgress) {
    const mm = await import('@magenta/music');
    
    if (onProgress) onProgress(30, 'Initializing Onsets and Frames...');
    
    const model = new mm.OnsetsAndFrames(config.checkpoints[0]);
    await model.initialize();
    
    return model;
  }

  /**
   * Check if model is loaded
   * @param {string} modelName 
   * @returns {boolean}
   */
  isLoaded(modelName) {
    return this.loadedModels.has(modelName);
  }

  /**
   * Dispose of a loaded model
   * @param {string} modelName 
   */
  dispose(modelName) {
    const model = this.loadedModels.get(modelName);
    if (model && typeof model.dispose === 'function') {
      model.dispose();
    }
    this.loadedModels.delete(modelName);
  }

  /**
   * Dispose all loaded models
   */
  disposeAll() {
    for (const [name] of this.loadedModels) {
      this.dispose(name);
    }
  }

  /**
   * Get TensorFlow.js backend info
   * @returns {Promise<object>}
   */
  async getBackendInfo() {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    
    return {
      backend: tf.getBackend(),
      webgl: tf.env().getBool('WEBGL_VERSION') || 0,
      memory: tf.memory()
    };
  }

  /**
   * Set preferred backend
   * @param {string} backend - 'webgl', 'cpu', or 'wasm'
   */
  async setBackend(backend) {
    const tf = await import('@tensorflow/tfjs');
    await tf.setBackend(backend);
    await tf.ready();
  }
}

// Singleton instance
export const modelLoader = new ModelLoader();
