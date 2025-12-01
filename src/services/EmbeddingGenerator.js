/**
 * Embedding Generator - Generates embeddings using MusicVAE and other models
 */
import { modelLoader } from './ModelLoader';

export class EmbeddingGenerator {
  constructor() {
    this.musicVAE = null;
    this.initialized = false;
  }

  /**
   * Initialize the embedding generator
   * @param {Function} onProgress 
   */
  async initialize(onProgress = null) {
    if (this.initialized) return;

    try {
      this.musicVAE = await modelLoader.loadOnDemand('musicvae', onProgress);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize EmbeddingGenerator:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a note sequence
   * @param {NoteSequence} sequence 
   * @returns {Promise<Float32Array>}
   */
  async encode(sequence) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Quantize the sequence if needed
      const mm = await import('@magenta/music');
      const quantizedSeq = mm.sequences.isQuantizedSequence(sequence) 
        ? sequence 
        : mm.sequences.quantizeNoteSequence(sequence, 4);

      // Encode using MusicVAE
      const z = await this.musicVAE.encode([quantizedSeq]);
      const embedding = await z.data();
      z.dispose();

      return new Float32Array(embedding);
    } catch (error) {
      console.error('Encoding error:', error);
      // Return a zero embedding on error
      return new Float32Array(256).fill(0);
    }
  }

  /**
   * Batch encode multiple sequences
   * @param {NoteSequence[]} sequences 
   * @returns {Promise<Float32Array[]>}
   */
  async encodeBatch(sequences) {
    if (!this.initialized) {
      await this.initialize();
    }

    const embeddings = [];
    
    // Process in batches to avoid memory issues
    const batchSize = 8;
    for (let i = 0; i < sequences.length; i += batchSize) {
      const batch = sequences.slice(i, i + batchSize);
      
      try {
        const mm = await import('@magenta/music');
        const quantizedBatch = batch.map(seq => 
          mm.sequences.isQuantizedSequence(seq) 
            ? seq 
            : mm.sequences.quantizeNoteSequence(seq, 4)
        );

        const z = await this.musicVAE.encode(quantizedBatch);
        const batchEmbeddings = await z.data();
        z.dispose();

        // Split batch embeddings
        const embeddingSize = batchEmbeddings.length / batch.length;
        for (let j = 0; j < batch.length; j++) {
          const start = j * embeddingSize;
          embeddings.push(new Float32Array(batchEmbeddings.slice(start, start + embeddingSize)));
        }
      } catch (error) {
        console.error('Batch encoding error:', error);
        // Fill with zero embeddings on error
        for (let j = 0; j < batch.length; j++) {
          embeddings.push(new Float32Array(256).fill(0));
        }
      }
    }

    return embeddings;
  }

  /**
   * Compute similarity between two embeddings
   * @param {Float32Array} emb1 
   * @param {Float32Array} emb2 
   * @returns {number}
   */
  cosineSimilarity(emb1, emb2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < emb1.length; i++) {
      dotProduct += emb1[i] * emb2[i];
      norm1 += emb1[i] * emb1[i];
      norm2 += emb2[i] * emb2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.initialized = false;
    this.musicVAE = null;
  }
}

// Singleton instance
export const embeddingGenerator = new EmbeddingGenerator();
