import { openDB } from 'idb';

/**
 * Cache Manager - Handles IndexedDB caching for models and analysis results
 */
export class CacheManager {
  static DB_NAME = 'MusicStructureTreeDB';
  static DB_VERSION = 1;
  static db = null;

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>}
   */
  static async initialize() {
    if (this.db) return this.db;

    this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Models store
        if (!db.objectStoreNames.contains('models')) {
          const modelStore = db.createObjectStore('models', { keyPath: 'name' });
          modelStore.createIndex('timestamp', 'timestamp');
        }

        // Analyses store
        if (!db.objectStoreNames.contains('analyses')) {
          const analysisStore = db.createObjectStore('analyses', { keyPath: 'fileHash' });
          analysisStore.createIndex('timestamp', 'timestamp');
          analysisStore.createIndex('fileName', 'fileName');
        }

        // Embeddings store
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingStore = db.createObjectStore('embeddings', { keyPath: 'id' });
          embeddingStore.createIndex('fileHash', 'fileHash');
          embeddingStore.createIndex('segmentId', 'segmentId');
        }
      }
    });

    return this.db;
  }

  /**
   * Cache model weights
   * @param {string} modelName - Model identifier
   * @param {ArrayBuffer} weights - Model weights
   */
  static async cacheModel(modelName, weights) {
    const db = await this.initialize();
    await db.put('models', {
      name: modelName,
      weights,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieve cached model
   * @param {string} modelName - Model identifier
   * @returns {Promise<ArrayBuffer|null>}
   */
  static async getModel(modelName) {
    const db = await this.initialize();
    const record = await db.get('models', modelName);
    return record?.weights || null;
  }

  /**
   * Check if model is cached
   * @param {string} modelName 
   * @returns {Promise<boolean>}
   */
  static async hasModel(modelName) {
    const db = await this.initialize();
    const record = await db.get('models', modelName);
    return !!record;
  }

  /**
   * Cache analysis results
   * @param {string} fileHash - File content hash
   * @param {string} fileName - Original file name
   * @param {object} results - Analysis results
   */
  static async cacheAnalysis(fileHash, fileName, results) {
    const db = await this.initialize();
    await db.put('analyses', {
      fileHash,
      fileName,
      results,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieve cached analysis
   * @param {string} fileHash - File content hash
   * @returns {Promise<object|null>}
   */
  static async getAnalysis(fileHash) {
    const db = await this.initialize();
    const record = await db.get('analyses', fileHash);
    return record?.results || null;
  }

  /**
   * Cache embeddings
   * @param {string} fileHash - File content hash
   * @param {string} segmentId - Segment identifier
   * @param {Float32Array} embedding - Embedding vector
   */
  static async cacheEmbedding(fileHash, segmentId, embedding) {
    const db = await this.initialize();
    await db.put('embeddings', {
      id: `${fileHash}_${segmentId}`,
      fileHash,
      segmentId,
      embedding: Array.from(embedding),
      timestamp: Date.now()
    });
  }

  /**
   * Retrieve cached embedding
   * @param {string} fileHash 
   * @param {string} segmentId 
   * @returns {Promise<Float32Array|null>}
   */
  static async getEmbedding(fileHash, segmentId) {
    const db = await this.initialize();
    const record = await db.get('embeddings', `${fileHash}_${segmentId}`);
    return record ? new Float32Array(record.embedding) : null;
  }

  /**
   * Get all embeddings for a file
   * @param {string} fileHash 
   * @returns {Promise<Map<string, Float32Array>>}
   */
  static async getEmbeddingsForFile(fileHash) {
    const db = await this.initialize();
    const embeddings = new Map();
    
    const tx = db.transaction('embeddings', 'readonly');
    const index = tx.store.index('fileHash');
    
    let cursor = await index.openCursor(IDBKeyRange.only(fileHash));
    while (cursor) {
      embeddings.set(cursor.value.segmentId, new Float32Array(cursor.value.embedding));
      cursor = await cursor.continue();
    }

    return embeddings;
  }

  /**
   * Clear all cached data
   */
  static async clearAll() {
    const db = await this.initialize();
    
    const tx = db.transaction(['models', 'analyses', 'embeddings'], 'readwrite');
    await Promise.all([
      tx.objectStore('models').clear(),
      tx.objectStore('analyses').clear(),
      tx.objectStore('embeddings').clear()
    ]);
  }

  /**
   * Clear cached data older than specified age
   * @param {number} maxAge - Maximum age in milliseconds
   */
  static async clearOld(maxAge) {
    const db = await this.initialize();
    const cutoff = Date.now() - maxAge;

    for (const storeName of ['models', 'analyses', 'embeddings']) {
      const tx = db.transaction(storeName, 'readwrite');
      const index = tx.store.index('timestamp');
      
      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }
  }

  /**
   * Get total cache size
   * @returns {Promise<number>} Size in bytes
   */
  static async getSize() {
    const db = await this.initialize();
    let totalSize = 0;

    for (const storeName of ['models', 'analyses', 'embeddings']) {
      const tx = db.transaction(storeName, 'readonly');
      let cursor = await tx.store.openCursor();
      
      while (cursor) {
        const value = cursor.value;
        totalSize += this.estimateSize(value);
        cursor = await cursor.continue();
      }
    }

    return totalSize;
  }

  /**
   * Estimate size of an object in bytes
   * @param {any} obj 
   * @returns {number}
   */
  static estimateSize(obj) {
    const str = JSON.stringify(obj);
    return str ? str.length * 2 : 0; // UTF-16 encoding
  }

  /**
   * Compute hash of file content
   * @param {File} file 
   * @returns {Promise<string>}
   */
  static async computeFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
