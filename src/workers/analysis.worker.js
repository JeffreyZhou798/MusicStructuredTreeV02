/**
 * Web Worker for heavy analysis computations
 */

// Import required modules (will be bundled)
// Note: In production, these would be properly bundled with the worker

self.addEventListener('message', async (e) => {
  const { taskType, data, taskId } = e.data;

  try {
    let result;

    switch (taskType) {
      case 'extract_features':
        result = await extractFeatures(data);
        break;

      case 'compute_similarity':
        result = computeSimilarityMatrix(data);
        break;

      case 'cluster':
        result = performClustering(data);
        break;

      case 'dtw_align':
        result = performDTW(data);
        break;

      case 'pca':
        result = performPCA(data);
        break;

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    self.postMessage({ taskId, result, status: 'success' });
  } catch (error) {
    self.postMessage({ 
      taskId, 
      error: error.message, 
      status: 'error' 
    });
  }
});

/**
 * Extract features from notes
 */
function extractFeatures(data) {
  const { notes, startTime, endTime } = data;
  
  // Filter notes in time range
  const segmentNotes = notes.filter(n => 
    n.startTime >= startTime && n.startTime < endTime
  );

  if (segmentNotes.length === 0) {
    return {
      intervalContour: [],
      rhythmFingerprint: [],
      pitchClassHistogram: new Array(12).fill(0),
      noteCount: 0,
      duration: endTime - startTime
    };
  }

  // Compute interval contour
  const sortedNotes = [...segmentNotes].sort((a, b) => a.startTime - b.startTime);
  const intervalContour = [];
  for (let i = 1; i < sortedNotes.length; i++) {
    intervalContour.push(sortedNotes[i].pitch - sortedNotes[i - 1].pitch);
  }

  // Compute rhythm fingerprint (IOI ratios)
  const rhythmFingerprint = [];
  for (let i = 2; i < sortedNotes.length; i++) {
    const ioi1 = sortedNotes[i - 1].startTime - sortedNotes[i - 2].startTime;
    const ioi2 = sortedNotes[i].startTime - sortedNotes[i - 1].startTime;
    if (ioi1 > 0) {
      rhythmFingerprint.push(Math.min(ioi2 / ioi1, 4));
    }
  }

  // Compute pitch class histogram
  const pitchClassHistogram = new Array(12).fill(0);
  segmentNotes.forEach(note => {
    const pc = note.pitch % 12;
    const duration = note.endTime - note.startTime;
    pitchClassHistogram[pc] += duration;
  });

  // Normalize histogram
  const sum = pitchClassHistogram.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < 12; i++) {
      pitchClassHistogram[i] /= sum;
    }
  }

  // Compute statistics
  const pitches = segmentNotes.map(n => n.pitch);
  const durations = segmentNotes.map(n => n.endTime - n.startTime);

  return {
    intervalContour,
    rhythmFingerprint,
    pitchClassHistogram,
    noteCount: segmentNotes.length,
    duration: endTime - startTime,
    averagePitch: pitches.reduce((a, b) => a + b, 0) / pitches.length,
    pitchRange: Math.max(...pitches) - Math.min(...pitches),
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length
  };
}

/**
 * Compute pairwise similarity matrix
 */
function computeSimilarityMatrix(data) {
  const { embeddings } = data;
  const n = embeddings.length;
  const matrix = [];

  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push(1.0);
      } else {
        row.push(cosineSimilarity(embeddings[i], embeddings[j]));
      }
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Perform K-Means clustering
 */
function performClustering(data) {
  const { embeddings, k, maxIterations = 100 } = data;
  
  if (embeddings.length === 0) {
    return { labels: [], centroids: [], inertia: 0 };
  }

  const dim = embeddings[0].length;
  
  // Initialize centroids randomly
  const centroids = [];
  const used = new Set();
  while (centroids.length < k && centroids.length < embeddings.length) {
    const idx = Math.floor(Math.random() * embeddings.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push([...embeddings[idx]]);
    }
  }

  let labels = new Array(embeddings.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign to nearest centroid
    const newLabels = embeddings.map(emb => {
      let minDist = Infinity;
      let label = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = euclideanDistance(emb, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          label = c;
        }
      }
      return label;
    });

    // Check convergence
    if (arraysEqual(labels, newLabels)) break;
    labels = newLabels;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = embeddings.filter((_, i) => labels[i] === c);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dim; d++) {
          centroids[c][d] = clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
        }
      }
    }
  }

  // Compute inertia
  let inertia = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const dist = euclideanDistance(embeddings[i], centroids[labels[i]]);
    inertia += dist * dist;
  }

  return { labels, centroids, inertia };
}

/**
 * Perform DTW alignment
 */
function performDTW(data) {
  const { seq1, seq2 } = data;
  
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
      const cost = euclideanDistance(seq1[i - 1], seq2[j - 1]);
      dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
    }
  }

  // Backtrack
  const path = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    path.unshift([i - 1, j - 1]);
    const diag = dtw[i - 1][j - 1];
    const left = dtw[i][j - 1];
    const up = dtw[i - 1][j];
    if (diag <= left && diag <= up) { i--; j--; }
    else if (left < up) { j--; }
    else { i--; }
  }

  return {
    cost: dtw[n][m],
    path,
    normalizedCost: dtw[n][m] / path.length
  };
}

/**
 * Perform PCA dimensionality reduction
 */
function performPCA(data) {
  const { embeddings, dimensions = 2 } = data;
  
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

  // Compute covariance matrix (simplified)
  const cov = Array(d).fill(null).map(() => Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      for (const row of centered) {
        cov[i][j] += row[i] * row[j];
      }
      cov[i][j] /= (n - 1);
    }
  }

  // Power iteration for principal components
  const pcs = [];
  for (let pc = 0; pc < dimensions; pc++) {
    let v = new Array(d).fill(1 / Math.sqrt(d));
    
    for (let iter = 0; iter < 50; iter++) {
      // Multiply by covariance
      const newV = new Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          newV[i] += cov[i][j] * v[j];
        }
      }
      
      // Deflate by previous PCs
      for (const prevPc of pcs) {
        const dot = newV.reduce((sum, val, i) => sum + val * prevPc[i], 0);
        for (let i = 0; i < d; i++) {
          newV[i] -= dot * prevPc[i];
        }
      }
      
      // Normalize
      const norm = Math.sqrt(newV.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        v = newV.map(val => val / norm);
      }
    }
    
    pcs.push(v);
  }

  // Project data
  const projected = centered.map(row => {
    return pcs.map(pc => row.reduce((sum, val, i) => sum + val * pc[i], 0));
  });

  // Normalize to [0, 1]
  const mins = new Array(dimensions).fill(Infinity);
  const maxs = new Array(dimensions).fill(-Infinity);
  
  for (const point of projected) {
    for (let i = 0; i < dimensions; i++) {
      mins[i] = Math.min(mins[i], point[i]);
      maxs[i] = Math.max(maxs[i], point[i]);
    }
  }

  return projected.map(point => 
    point.map((val, i) => {
      const range = maxs[i] - mins[i];
      return range > 0 ? (val - mins[i]) / range : 0.5;
    })
  );
}

// Utility functions
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

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
