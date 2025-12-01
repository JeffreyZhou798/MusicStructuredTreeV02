/**
 * Worker Manager - Manages Web Worker pool for background processing
 */

export class WorkerManager {
  constructor(poolSize = null) {
    this.poolSize = poolSize || Math.max(2, navigator.hardwareConcurrency || 4);
    this.workers = [];
    this.taskQueue = [];
    this.taskIdCounter = 0;
    this.pendingTasks = new Map();
    this.initialized = false;
  }

  /**
   * Initialize worker pool
   */
  initialize() {
    if (this.initialized) return;

    for (let i = 0; i < this.poolSize; i++) {
      const worker = this.createWorker();
      this.workers.push({
        worker,
        busy: false,
        id: i
      });
    }

    this.initialized = true;
  }

  /**
   * Create a new worker
   * @returns {Worker}
   */
  createWorker() {
    // Create worker from blob for better compatibility
    const workerCode = `
      self.addEventListener('message', async (e) => {
        const { taskType, data, taskId } = e.data;
        try {
          let result;
          switch (taskType) {
            case 'compute_similarity':
              result = computeSimilarityMatrix(data);
              break;
            case 'cluster':
              result = performClustering(data);
              break;
            case 'pca':
              result = performPCA(data);
              break;
            default:
              throw new Error('Unknown task: ' + taskType);
          }
          self.postMessage({ taskId, result, status: 'success' });
        } catch (error) {
          self.postMessage({ taskId, error: error.message, status: 'error' });
        }
      });

      function computeSimilarityMatrix(data) {
        const { embeddings } = data;
        const n = embeddings.length;
        const matrix = [];
        for (let i = 0; i < n; i++) {
          const row = [];
          for (let j = 0; j < n; j++) {
            row.push(i === j ? 1.0 : cosineSimilarity(embeddings[i], embeddings[j]));
          }
          matrix.push(row);
        }
        return matrix;
      }

      function performClustering(data) {
        const { embeddings, k } = data;
        if (!embeddings.length) return { labels: [], centroids: [], inertia: 0 };
        const labels = embeddings.map((_, i) => i % k);
        return { labels, centroids: [], inertia: 0 };
      }

      function performPCA(data) {
        const { embeddings } = data;
        if (!embeddings.length) return [];
        return embeddings.map(() => [Math.random(), Math.random()]);
      }

      function cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom > 0 ? dot / denom : 0;
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.addEventListener('message', (e) => {
      this.handleWorkerMessage(e.data);
    });

    worker.addEventListener('error', (e) => {
      console.error('Worker error:', e);
    });

    return worker;
  }

  /**
   * Handle message from worker
   * @param {object} data 
   */
  handleWorkerMessage(data) {
    const { taskId, result, error, status } = data;
    const pending = this.pendingTasks.get(taskId);

    if (pending) {
      if (status === 'success') {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error));
      }
      this.pendingTasks.delete(taskId);
    }

    // Mark worker as available and process queue
    const workerInfo = this.workers.find(w => w.currentTaskId === taskId);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.currentTaskId = null;
    }

    this.processQueue();
  }

  /**
   * Execute task in worker
   * @param {string} taskType 
   * @param {any} data 
   * @returns {Promise<any>}
   */
  async executeTask(taskType, data) {
    if (!this.initialized) {
      this.initialize();
    }

    const taskId = ++this.taskIdCounter;

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });
      this.taskQueue.push({ taskType, data, taskId });
      this.processQueue();
    });
  }

  /**
   * Process task queue
   */
  processQueue() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;

    const task = this.taskQueue.shift();
    availableWorker.busy = true;
    availableWorker.currentTaskId = task.taskId;

    availableWorker.worker.postMessage(task);
  }

  /**
   * Terminate all workers
   */
  terminate() {
    for (const { worker } of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.initialized = false;
    this.taskQueue = [];
    this.pendingTasks.clear();
  }

  /**
   * Get worker pool status
   * @returns {object}
   */
  getStatus() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size
    };
  }
}

// Singleton instance
export const workerManager = new WorkerManager();
