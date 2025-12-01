/**
 * Color Mapper - Generates color schemes for structure tree visualization
 */
export class ColorMapper {
  constructor() {
    // Level lightness mapping (higher levels = darker)
    this.levelLightness = {
      'motive': 75,
      'motif': 75,
      'leaf': 65,
      'subphrase': 65,
      'phrase': 55,
      'period': 45,
      'branch': 45,
      'theme': 40,
      'section': 35,
      'movement': 30,
      'composition': 25,
      'root': 22
    };

    // Relationship hue mapping
    this.relationHues = {
      'repetition': 210,      // Blue - 重复
      'recapitulation': 220,  // Blue-ish - 再现
      'sequence': 180,        // Cyan - 模进
      'variation': 150,       // Green - 变奏
      'development': 120,     // Green - 展开
      'contrast': 0,          // Red - 对比
      'recurrence': 270,      // Purple - 再现
      'grouped': 60,          // Yellow - 分组
      'unknown': 200          // Light blue - 未知
    };
  }

  /**
   * Generate color scheme for structure tree
   * @param {ClusterNode} tree - Root node of structure tree
   * @param {Map<string, Float32Array>} embeddings - Node embeddings
   * @returns {ColorScheme}
   */
  generateColorScheme(tree, embeddings) {
    const nodeColors = new Map();
    const relationshipColors = new Map();

    // Collect all nodes
    const allNodes = this.collectNodes(tree);

    // Apply PCA to embeddings for hue assignment
    const embeddingArray = [];
    const nodeIds = [];

    allNodes.forEach(node => {
      const embedding = embeddings.get(node.id);
      if (embedding) {
        embeddingArray.push(Array.from(embedding));
        nodeIds.push(node.id);
      }
    });

    // Compute PCA projection
    const pcaCoords = embeddingArray.length > 0 
      ? this.applyPCA(embeddingArray) 
      : [];

    // Assign colors to nodes
    allNodes.forEach((node, index) => {
      const pcaIndex = nodeIds.indexOf(node.id);
      const coords = pcaIndex >= 0 ? pcaCoords[pcaIndex] : [0.5, 0.5];
      const color = this.computeNodeColor(node, coords);
      nodeColors.set(node.id, color);
    });

    // Assign relationship colors
    for (const [relation, hue] of Object.entries(this.relationHues)) {
      relationshipColors.set(relation, `hsl(${hue}, 70%, 50%)`);
    }

    return {
      nodeColors,
      relationshipColors,
      levelLightness: this.levelLightness
    };
  }

  /**
   * Collect all nodes from tree
   * @param {ClusterNode} node 
   * @returns {ClusterNode[]}
   */
  collectNodes(node) {
    const nodes = [node];
    if (node.children) {
      node.children.forEach(child => {
        nodes.push(...this.collectNodes(child));
      });
    }
    return nodes;
  }

  /**
   * Apply PCA for dimensionality reduction
   * @param {number[][]} embeddings - Array of embedding vectors
   * @returns {number[][]} 2D coordinates
   */
  applyPCA(embeddings) {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return [[0.5, 0.5]];

    const n = embeddings.length;
    const d = embeddings[0].length;

    // Center the data
    const mean = new Array(d).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < d; i++) {
        mean[i] += emb[i] / n;
      }
    }

    const centered = embeddings.map(emb => 
      emb.map((val, i) => val - mean[i])
    );

    // Compute covariance matrix (simplified - just use first 2 principal directions)
    // For production, use proper SVD library
    const cov = this.computeCovariance(centered);
    
    // Power iteration to find first 2 eigenvectors
    const pc1 = this.powerIteration(cov);
    const pc2 = this.powerIteration(cov, pc1);

    // Project data onto principal components
    const projected = centered.map(emb => {
      const x = this.dotProduct(emb, pc1);
      const y = this.dotProduct(emb, pc2);
      return [x, y];
    });

    // Normalize to [0, 1]
    return this.normalizeCoords(projected);
  }

  /**
   * Compute covariance matrix
   * @param {number[][]} data 
   * @returns {number[][]}
   */
  computeCovariance(data) {
    const n = data.length;
    const d = data[0].length;
    const cov = Array(d).fill(null).map(() => Array(d).fill(0));

    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (const row of data) {
          sum += row[i] * row[j];
        }
        cov[i][j] = sum / (n - 1);
      }
    }

    return cov;
  }

  /**
   * Power iteration to find principal eigenvector
   * @param {number[][]} matrix 
   * @param {number[]} deflate - Vector to deflate (optional)
   * @returns {number[]}
   */
  powerIteration(matrix, deflate = null) {
    const d = matrix.length;
    let v = Array(d).fill(1 / Math.sqrt(d));

    // Deflate if needed
    let mat = matrix;
    if (deflate) {
      mat = this.deflateMatrix(matrix, deflate);
    }

    // Iterate
    for (let iter = 0; iter < 50; iter++) {
      const newV = this.matVecMult(mat, v);
      const norm = Math.sqrt(newV.reduce((sum, x) => sum + x * x, 0));
      if (norm === 0) break;
      v = newV.map(x => x / norm);
    }

    return v;
  }

  /**
   * Deflate matrix by removing component along vector
   * @param {number[][]} matrix 
   * @param {number[]} v 
   * @returns {number[][]}
   */
  deflateMatrix(matrix, v) {
    const d = matrix.length;
    const result = Array(d).fill(null).map(() => Array(d).fill(0));

    // Compute eigenvalue
    const mv = this.matVecMult(matrix, v);
    const lambda = this.dotProduct(v, mv);

    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        result[i][j] = matrix[i][j] - lambda * v[i] * v[j];
      }
    }

    return result;
  }

  /**
   * Matrix-vector multiplication
   * @param {number[][]} mat 
   * @param {number[]} vec 
   * @returns {number[]}
   */
  matVecMult(mat, vec) {
    return mat.map(row => this.dotProduct(row, vec));
  }

  /**
   * Dot product
   * @param {number[]} a 
   * @param {number[]} b 
   * @returns {number}
   */
  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  /**
   * Normalize coordinates to [0, 1]
   * @param {number[][]} coords 
   * @returns {number[][]}
   */
  normalizeCoords(coords) {
    if (coords.length === 0) return [];

    const minX = Math.min(...coords.map(c => c[0]));
    const maxX = Math.max(...coords.map(c => c[0]));
    const minY = Math.min(...coords.map(c => c[1]));
    const maxY = Math.max(...coords.map(c => c[1]));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return coords.map(([x, y]) => [
      (x - minX) / rangeX,
      (y - minY) / rangeY
    ]);
  }

  /**
   * Compute color for a node
   * @param {ClusterNode} node 
   * @param {number[]} pcaCoords - [0-1, 0-1]
   * @returns {string} HSL color string
   */
  computeNodeColor(node, pcaCoords) {
    // Hue from PCA (0-360)
    let hue;
    if (node.relationType && this.relationHues[node.relationType]) {
      // Use relationship-based hue
      hue = this.relationHues[node.relationType];
    } else {
      // Use PCA-based hue
      hue = Math.round(pcaCoords[0] * 360);
    }

    // Saturation from confidence
    const saturation = 40 + (node.confidence || 0.5) * 40; // 40-80%

    // Lightness from level
    const lightness = this.levelLightness[node.level] || 50;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Get contrasting color for text
   * @param {string} bgColor - HSL color string
   * @returns {string}
   */
  getContrastColor(bgColor) {
    // Parse lightness from HSL
    const match = bgColor.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
    if (match) {
      const lightness = parseInt(match[1]);
      return lightness > 50 ? '#333333' : '#ffffff';
    }
    return '#333333';
  }

  /**
   * Generate gradient for relationship visualization
   * @param {string} color1 
   * @param {string} color2 
   * @returns {string}
   */
  generateGradient(color1, color2) {
    return `linear-gradient(90deg, ${color1}, ${color2})`;
  }
}
