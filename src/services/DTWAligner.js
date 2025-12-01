/**
 * DTW Aligner - Dynamic Time Warping for multimodal alignment
 */

export class DTWAligner {
  /**
   * Align two feature sequences using DTW
   * @param {Float32Array[]} seq1 - First sequence (e.g., symbolic chroma)
   * @param {Float32Array[]} seq2 - Second sequence (e.g., audio chroma)
   * @returns {AlignmentResult}
   */
  align(seq1, seq2) {
    if (seq1.length === 0 || seq2.length === 0) {
      return { cost: Infinity, path: [], normalizedCost: Infinity };
    }

    const n = seq1.length;
    const m = seq2.length;

    // Initialize cost matrix
    const dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    // Fill cost matrix
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = this.distance(seq1[i - 1], seq2[j - 1]);
        dtw[i][j] = cost + Math.min(
          dtw[i - 1][j],     // insertion
          dtw[i][j - 1],     // deletion
          dtw[i - 1][j - 1]  // match
        );
      }
    }

    // Backtrack to find optimal path
    const path = this.backtrack(dtw, n, m);
    const totalCost = dtw[n][m];
    const normalizedCost = totalCost / path.length;

    return {
      cost: totalCost,
      path,
      normalizedCost
    };
  }

  /**
   * Backtrack through DTW matrix to find optimal path
   * @param {number[][]} dtw 
   * @param {number} n 
   * @param {number} m 
   * @returns {number[][]}
   */
  backtrack(dtw, n, m) {
    const path = [];
    let i = n, j = m;

    while (i > 0 && j > 0) {
      path.unshift([i - 1, j - 1]);

      const diag = dtw[i - 1][j - 1];
      const left = dtw[i][j - 1];
      const up = dtw[i - 1][j];

      if (diag <= left && diag <= up) {
        i--; j--;
      } else if (left < up) {
        j--;
      } else {
        i--;
      }
    }

    return path;
  }

  /**
   * Compute distance between two feature vectors
   * @param {Float32Array} a 
   * @param {Float32Array} b 
   * @returns {number}
   */
  distance(a, b) {
    // Euclidean distance
    let sum = 0;
    const len = Math.min(a.length, b.length);
    
    for (let i = 0; i < len; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  /**
   * Compute cosine distance
   * @param {Float32Array} a 
   * @param {Float32Array} b 
   * @returns {number}
   */
  cosineDistance(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
    return 1 - similarity;
  }

  /**
   * Get alignment path as time mapping
   * @param {AlignmentResult} result 
   * @param {number} seq1Duration - Duration of first sequence
   * @param {number} seq2Duration - Duration of second sequence
   * @returns {TimeMapping[]}
   */
  getTimeMapping(result, seq1Duration, seq2Duration) {
    const { path } = result;
    if (path.length === 0) return [];

    const seq1FrameRate = path[path.length - 1][0] + 1;
    const seq2FrameRate = path[path.length - 1][1] + 1;

    return path.map(([i, j]) => ({
      time1: (i / seq1FrameRate) * seq1Duration,
      time2: (j / seq2FrameRate) * seq2Duration
    }));
  }

  /**
   * Align chroma features specifically
   * @param {Float32Array[]} symbolicChroma 
   * @param {Float32Array[]} audioChroma 
   * @returns {AlignmentResult}
   */
  alignChroma(symbolicChroma, audioChroma) {
    // Normalize chroma vectors
    const normSymbolic = symbolicChroma.map(c => this.normalizeVector(c));
    const normAudio = audioChroma.map(c => this.normalizeVector(c));

    return this.align(normSymbolic, normAudio);
  }

  /**
   * Normalize a vector to unit length
   * @param {Float32Array} vec 
   * @returns {Float32Array}
   */
  normalizeVector(vec) {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) return vec;

    const normalized = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      normalized[i] = vec[i] / norm;
    }
    return normalized;
  }

  /**
   * Compute alignment quality score
   * @param {AlignmentResult} result 
   * @returns {number} Quality score 0-1
   */
  computeQualityScore(result) {
    if (result.path.length === 0) return 0;

    // Lower normalized cost = better alignment
    // Map to 0-1 range where 1 is best
    const maxExpectedCost = 2.0; // Adjust based on feature type
    const quality = Math.max(0, 1 - result.normalizedCost / maxExpectedCost);
    
    return quality;
  }
}

export const dtwAligner = new DTWAligner();
