/**
 * Clustering Engine - Implements KMeans and hierarchical clustering
 */

export class ClusteringEngine {
  /**
   * Perform K-Means clustering
   * @param {Float32Array[]} embeddings 
   * @param {number} k 
   * @param {number} maxIterations 
   * @returns {ClusterResult}
   */
  kMeans(embeddings, k, maxIterations = 100) {
    if (embeddings.length === 0) return { labels: [], centroids: [], inertia: 0 };
    if (k >= embeddings.length) {
      return {
        labels: embeddings.map((_, i) => i),
        centroids: embeddings.slice(0, k),
        inertia: 0
      };
    }

    const dim = embeddings[0].length;
    
    // Initialize centroids using k-means++
    const centroids = this.initializeCentroids(embeddings, k);
    let labels = new Array(embeddings.length).fill(0);
    let prevInertia = Infinity;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      labels = this.assignClusters(embeddings, centroids);
      
      // Update centroids
      const newCentroids = this.updateCentroids(embeddings, labels, k, dim);
      
      // Check convergence
      const inertia = this.computeInertia(embeddings, labels, newCentroids);
      if (Math.abs(prevInertia - inertia) < 1e-6) break;
      
      prevInertia = inertia;
      for (let i = 0; i < k; i++) {
        centroids[i] = newCentroids[i];
      }
    }

    return {
      labels,
      centroids,
      inertia: this.computeInertia(embeddings, labels, centroids)
    };
  }

  /**
   * Initialize centroids using k-means++
   * @param {Float32Array[]} embeddings 
   * @param {number} k 
   * @returns {Float32Array[]}
   */
  initializeCentroids(embeddings, k) {
    const centroids = [];
    const n = embeddings.length;
    
    // First centroid: random
    centroids.push(new Float32Array(embeddings[Math.floor(Math.random() * n)]));
    
    // Remaining centroids: weighted by distance
    for (let i = 1; i < k; i++) {
      const distances = embeddings.map(emb => {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const dist = this.euclideanDistance(emb, centroid);
          minDist = Math.min(minDist, dist);
        }
        return minDist * minDist;
      });
      
      const totalDist = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDist;
      
      for (let j = 0; j < n; j++) {
        random -= distances[j];
        if (random <= 0) {
          centroids.push(new Float32Array(embeddings[j]));
          break;
        }
      }
    }
    
    return centroids;
  }

  /**
   * Assign points to nearest centroid
   * @param {Float32Array[]} embeddings 
   * @param {Float32Array[]} centroids 
   * @returns {number[]}
   */
  assignClusters(embeddings, centroids) {
    return embeddings.map(emb => {
      let minDist = Infinity;
      let label = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const dist = this.euclideanDistance(emb, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          label = i;
        }
      }
      
      return label;
    });
  }

  /**
   * Update centroids based on cluster assignments
   * @param {Float32Array[]} embeddings 
   * @param {number[]} labels 
   * @param {number} k 
   * @param {number} dim 
   * @returns {Float32Array[]}
   */
  updateCentroids(embeddings, labels, k, dim) {
    const centroids = [];
    
    for (let i = 0; i < k; i++) {
      const clusterPoints = embeddings.filter((_, idx) => labels[idx] === i);
      
      if (clusterPoints.length === 0) {
        // Empty cluster: reinitialize randomly
        centroids.push(new Float32Array(embeddings[Math.floor(Math.random() * embeddings.length)]));
      } else {
        // Compute mean
        const mean = new Float32Array(dim);
        for (const point of clusterPoints) {
          for (let j = 0; j < dim; j++) {
            mean[j] += point[j] / clusterPoints.length;
          }
        }
        centroids.push(mean);
      }
    }
    
    return centroids;
  }

  /**
   * Compute inertia (sum of squared distances to centroids)
   * @param {Float32Array[]} embeddings 
   * @param {number[]} labels 
   * @param {Float32Array[]} centroids 
   * @returns {number}
   */
  computeInertia(embeddings, labels, centroids) {
    let inertia = 0;
    for (let i = 0; i < embeddings.length; i++) {
      const dist = this.euclideanDistance(embeddings[i], centroids[labels[i]]);
      inertia += dist * dist;
    }
    return inertia;
  }

  /**
   * Find optimal k using elbow method
   * @param {Float32Array[]} embeddings 
   * @param {number} maxK 
   * @returns {number}
   */
  findOptimalK(embeddings, maxK = 10) {
    if (embeddings.length <= 2) return 1;
    
    maxK = Math.min(maxK, embeddings.length - 1);
    const inertias = [];
    
    for (let k = 1; k <= maxK; k++) {
      const result = this.kMeans(embeddings, k);
      inertias.push(result.inertia);
    }
    
    // Find elbow point
    let maxCurvature = 0;
    let optimalK = 2;
    
    for (let i = 1; i < inertias.length - 1; i++) {
      const curvature = inertias[i - 1] - 2 * inertias[i] + inertias[i + 1];
      if (curvature > maxCurvature) {
        maxCurvature = curvature;
        optimalK = i + 1;
      }
    }
    
    return optimalK;
  }

  /**
   * Perform hierarchical clustering (agglomerative)
   * @param {Float32Array[]} embeddings 
   * @param {object[]} metadata 
   * @returns {ClusterTree}
   */
  hierarchicalClustering(embeddings, metadata) {
    if (embeddings.length === 0) return null;
    
    // Initialize each point as a cluster
    let clusters = embeddings.map((emb, i) => ({
      id: `cluster_${i}`,
      embedding: emb,
      metadata: metadata[i],
      children: [],
      size: 1
    }));
    
    // Compute initial distance matrix
    const distMatrix = this.computeDistanceMatrix(embeddings);
    
    // Agglomerative clustering
    while (clusters.length > 1) {
      // Find closest pair
      let minDist = Infinity;
      let mergeI = 0, mergeJ = 1;
      
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = this.clusterDistance(clusters[i], clusters[j], distMatrix);
          if (dist < minDist) {
            minDist = dist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }
      
      // Merge clusters
      const merged = this.mergeClusters(clusters[mergeI], clusters[mergeJ]);
      
      // Update cluster list
      clusters = clusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
      clusters.push(merged);
    }
    
    return clusters[0];
  }

  /**
   * Compute distance matrix
   * @param {Float32Array[]} embeddings 
   * @returns {number[][]}
   */
  computeDistanceMatrix(embeddings) {
    const n = embeddings.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.euclideanDistance(embeddings[i], embeddings[j]);
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }
    
    return matrix;
  }

  /**
   * Compute distance between two clusters (average linkage)
   * @param {object} cluster1 
   * @param {object} cluster2 
   * @param {number[][]} distMatrix 
   * @returns {number}
   */
  clusterDistance(cluster1, cluster2, distMatrix) {
    return this.euclideanDistance(cluster1.embedding, cluster2.embedding);
  }

  /**
   * Merge two clusters
   * @param {object} cluster1 
   * @param {object} cluster2 
   * @returns {object}
   */
  mergeClusters(cluster1, cluster2) {
    // Compute merged embedding (weighted average)
    const totalSize = cluster1.size + cluster2.size;
    const mergedEmbedding = new Float32Array(cluster1.embedding.length);
    
    for (let i = 0; i < mergedEmbedding.length; i++) {
      mergedEmbedding[i] = (cluster1.embedding[i] * cluster1.size + 
                           cluster2.embedding[i] * cluster2.size) / totalSize;
    }
    
    return {
      id: `merged_${cluster1.id}_${cluster2.id}`,
      embedding: mergedEmbedding,
      children: [cluster1, cluster2],
      size: totalSize,
      metadata: null
    };
  }

  /**
   * Euclidean distance between two vectors
   * @param {Float32Array} a 
   * @param {Float32Array} b 
   * @returns {number}
   */
  euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Cosine similarity between two vectors
   * @param {Float32Array} a 
   * @param {Float32Array} b 
   * @returns {number}
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }
}

export const clusteringEngine = new ClusteringEngine();
