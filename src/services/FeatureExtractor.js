/**
 * Feature Extractor - Extracts musical features from symbolic and audio data
 */
export class SymbolicFeatureExtractor {
  /**
   * Extract features from note sequence
   * @param {NoteSequence} sequence - Magenta note sequence
   * @returns {SymbolicFeatures}
   */
  extract(sequence) {
    const notes = sequence.notes || [];
    
    if (notes.length === 0) {
      return this.getEmptyFeatures();
    }

    const pitches = notes.map(n => n.pitch);
    const durations = notes.map(n => n.endTime - n.startTime);
    
    return {
      intervalContour: this.computeIntervalContour(notes),
      rhythmFingerprint: this.computeRhythmFingerprint(notes),
      pitchClassHistogram: this.computePitchClassHistogram(notes),
      duration: sequence.totalTime || notes[notes.length - 1].endTime,
      noteCount: notes.length,
      averagePitch: this.average(pitches),
      pitchRange: Math.max(...pitches) - Math.min(...pitches),
      averageVelocity: this.average(notes.map(n => n.velocity || 80)),
      averageDuration: this.average(durations),
      pitchVariance: this.variance(pitches),
      rhythmVariance: this.variance(durations)
    };
  }

  /**
   * Get empty features object
   * @returns {SymbolicFeatures}
   */
  getEmptyFeatures() {
    return {
      intervalContour: [],
      rhythmFingerprint: [],
      pitchClassHistogram: new Array(12).fill(0),
      duration: 0,
      noteCount: 0,
      averagePitch: 0,
      pitchRange: 0,
      averageVelocity: 0,
      averageDuration: 0,
      pitchVariance: 0,
      rhythmVariance: 0
    };
  }

  /**
   * Compute interval contour (sequence of pitch intervals)
   * @param {Note[]} notes 
   * @returns {number[]}
   */
  computeIntervalContour(notes) {
    if (notes.length < 2) return [];
    
    const contour = [];
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    for (let i = 1; i < sortedNotes.length; i++) {
      const interval = sortedNotes[i].pitch - sortedNotes[i - 1].pitch;
      contour.push(interval);
    }
    
    return contour;
  }

  /**
   * Compute rhythm fingerprint (inter-onset interval ratios)
   * @param {Note[]} notes 
   * @returns {number[]}
   */
  computeRhythmFingerprint(notes) {
    if (notes.length < 3) return [];
    
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    const iois = []; // Inter-onset intervals
    
    for (let i = 1; i < sortedNotes.length; i++) {
      const ioi = sortedNotes[i].startTime - sortedNotes[i - 1].startTime;
      if (ioi > 0) iois.push(ioi);
    }
    
    if (iois.length < 2) return [];
    
    // Compute ratios between consecutive IOIs
    const ratios = [];
    for (let i = 1; i < iois.length; i++) {
      const ratio = iois[i] / iois[i - 1];
      ratios.push(Math.min(ratio, 4)); // Cap at 4 to avoid extreme values
    }
    
    return ratios;
  }

  /**
   * Compute pitch class histogram (12-dimensional)
   * @param {Note[]} notes 
   * @returns {number[]}
   */
  computePitchClassHistogram(notes) {
    const histogram = new Array(12).fill(0);
    
    notes.forEach(note => {
      const pitchClass = note.pitch % 12;
      const duration = note.endTime - note.startTime;
      histogram[pitchClass] += duration; // Weight by duration
    });
    
    // Normalize
    const sum = histogram.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < 12; i++) {
        histogram[i] /= sum;
      }
    }
    
    return histogram;
  }

  /**
   * Compute average of array
   * @param {number[]} arr 
   * @returns {number}
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Compute variance of array
   * @param {number[]} arr 
   * @returns {number}
   */
  variance(arr) {
    if (arr.length < 2) return 0;
    const avg = this.average(arr);
    const squaredDiffs = arr.map(x => Math.pow(x - avg, 2));
    return this.average(squaredDiffs);
  }

  /**
   * Extract features for a segment of notes
   * @param {Note[]} notes 
   * @param {number} startTime 
   * @param {number} endTime 
   * @returns {SymbolicFeatures}
   */
  extractForSegment(notes, startTime, endTime) {
    const segmentNotes = notes.filter(
      n => n.startTime >= startTime && n.startTime < endTime
    );
    
    return this.extract({
      notes: segmentNotes,
      totalTime: endTime - startTime
    });
  }

  /**
   * Compute melodic skeleton (strip ornaments)
   * @param {Note[]} notes 
   * @returns {Note[]}
   */
  computeMelodicSkeleton(notes) {
    if (notes.length < 3) return notes;
    
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    const skeleton = [sortedNotes[0]];
    
    // Simple approach: keep notes on strong beats and longer notes
    const avgDuration = this.average(sortedNotes.map(n => n.endTime - n.startTime));
    
    for (let i = 1; i < sortedNotes.length; i++) {
      const note = sortedNotes[i];
      const duration = note.endTime - note.startTime;
      
      // Keep if duration is above average or on beat
      if (duration >= avgDuration * 0.8) {
        skeleton.push(note);
      }
    }
    
    return skeleton;
  }

  /**
   * Compute contour similarity between two contours
   * @param {number[]} contour1 
   * @param {number[]} contour2 
   * @returns {number} Similarity score 0-1
   */
  contourSimilarity(contour1, contour2) {
    if (contour1.length === 0 || contour2.length === 0) return 0;
    
    // Normalize contours to same length using interpolation
    const targetLength = Math.max(contour1.length, contour2.length);
    const norm1 = this.interpolateContour(contour1, targetLength);
    const norm2 = this.interpolateContour(contour2, targetLength);
    
    // Compute correlation
    return this.correlation(norm1, norm2);
  }

  /**
   * Interpolate contour to target length
   * @param {number[]} contour 
   * @param {number} targetLength 
   * @returns {number[]}
   */
  interpolateContour(contour, targetLength) {
    if (contour.length === targetLength) return contour;
    
    const result = new Array(targetLength);
    const ratio = (contour.length - 1) / (targetLength - 1);
    
    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(lower + 1, contour.length - 1);
      const fraction = srcIndex - lower;
      
      result[i] = contour[lower] * (1 - fraction) + contour[upper] * fraction;
    }
    
    return result;
  }

  /**
   * Compute Pearson correlation coefficient
   * @param {number[]} arr1 
   * @param {number[]} arr2 
   * @returns {number}
   */
  correlation(arr1, arr2) {
    const n = arr1.length;
    if (n !== arr2.length || n === 0) return 0;
    
    const mean1 = this.average(arr1);
    const mean2 = this.average(arr2);
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(denom1 * denom2);
    if (denominator === 0) return 0;
    
    return (numerator / denominator + 1) / 2; // Normalize to 0-1
  }

  /**
   * Compute rhythm similarity
   * @param {number[]} rhythm1 
   * @param {number[]} rhythm2 
   * @returns {number}
   */
  rhythmSimilarity(rhythm1, rhythm2) {
    if (rhythm1.length === 0 || rhythm2.length === 0) return 0;
    
    // Normalize and compare
    const norm1 = this.normalizeRhythm(rhythm1);
    const norm2 = this.normalizeRhythm(rhythm2);
    
    return this.contourSimilarity(norm1, norm2);
  }

  /**
   * Normalize rhythm values
   * @param {number[]} rhythm 
   * @returns {number[]}
   */
  normalizeRhythm(rhythm) {
    const min = Math.min(...rhythm);
    const max = Math.max(...rhythm);
    const range = max - min;
    
    if (range === 0) return rhythm.map(() => 0.5);
    
    return rhythm.map(r => (r - min) / range);
  }
}

/**
 * Audio Feature Extractor
 */
export class AudioFeatureExtractor {
  /**
   * Extract features from audio buffer
   * @param {AudioBuffer} buffer 
   * @returns {Promise<AudioFeatures>}
   */
  async extract(buffer) {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    return {
      chroma: this.computeChromaSequence(channelData, sampleRate),
      mfcc: this.computeMFCCSequence(channelData, sampleRate),
      spectralCentroid: this.computeSpectralCentroidSequence(channelData, sampleRate),
      rms: this.computeRMSSequence(channelData),
      sampleRate,
      duration: buffer.duration
    };
  }

  /**
   * Compute chroma sequence over time
   * @param {Float32Array} channelData 
   * @param {number} sampleRate 
   * @returns {Float32Array[]}
   */
  computeChromaSequence(channelData, sampleRate) {
    const frameSize = 2048;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
    const chromaSequence = [];

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      chromaSequence.push(this.computeChroma(frame, sampleRate));
    }

    return chromaSequence;
  }

  /**
   * Compute chroma for a single frame
   * @param {Float32Array} frame 
   * @param {number} sampleRate 
   * @returns {Float32Array}
   */
  computeChroma(frame, sampleRate) {
    const chroma = new Float32Array(12);
    const spectrum = this.computeSpectrum(frame);
    const binWidth = sampleRate / (frame.length);

    for (let i = 1; i < spectrum.length; i++) {
      const frequency = i * binWidth;
      if (frequency >= 65 && frequency <= 2000) {
        const pitchClass = Math.round(12 * Math.log2(frequency / 440) + 69) % 12;
        if (pitchClass >= 0 && pitchClass < 12) {
          chroma[pitchClass] += spectrum[i];
        }
      }
    }

    // Normalize
    const max = Math.max(...chroma);
    if (max > 0) {
      for (let i = 0; i < 12; i++) {
        chroma[i] /= max;
      }
    }

    return chroma;
  }

  /**
   * Compute magnitude spectrum
   * @param {Float32Array} frame 
   * @returns {Float32Array}
   */
  computeSpectrum(frame) {
    // Apply Hann window
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
      windowed[i] = frame[i] * window;
    }

    // Simple DFT
    const spectrum = new Float32Array(frame.length / 2);
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < frame.length; n++) {
        const angle = -2 * Math.PI * k * n / frame.length;
        real += windowed[n] * Math.cos(angle);
        imag += windowed[n] * Math.sin(angle);
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }

    return spectrum;
  }

  /**
   * Compute MFCC sequence (simplified)
   * @param {Float32Array} channelData 
   * @param {number} sampleRate 
   * @returns {Float32Array[]}
   */
  computeMFCCSequence(channelData, sampleRate) {
    // Simplified MFCC - in production use Meyda library
    const frameSize = 2048;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
    const mfccSequence = [];

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      // Return spectral features as proxy for MFCC
      mfccSequence.push(this.computeSpectralFeatures(frame, sampleRate));
    }

    return mfccSequence;
  }

  /**
   * Compute spectral features for a frame
   * @param {Float32Array} frame 
   * @param {number} sampleRate 
   * @returns {Float32Array}
   */
  computeSpectralFeatures(frame, sampleRate) {
    const spectrum = this.computeSpectrum(frame);
    const features = new Float32Array(13);
    
    // Divide spectrum into 13 bands
    const bandSize = Math.floor(spectrum.length / 13);
    for (let i = 0; i < 13; i++) {
      let sum = 0;
      for (let j = i * bandSize; j < (i + 1) * bandSize && j < spectrum.length; j++) {
        sum += spectrum[j];
      }
      features[i] = Math.log(sum + 1e-10);
    }

    return features;
  }

  /**
   * Compute spectral centroid sequence
   * @param {Float32Array} channelData 
   * @param {number} sampleRate 
   * @returns {Float32Array}
   */
  computeSpectralCentroidSequence(channelData, sampleRate) {
    const frameSize = 2048;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
    const centroids = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      const spectrum = this.computeSpectrum(frame);
      
      let weightedSum = 0, sum = 0;
      const binWidth = sampleRate / frame.length;
      
      for (let j = 0; j < spectrum.length; j++) {
        weightedSum += j * binWidth * spectrum[j];
        sum += spectrum[j];
      }
      
      centroids[i] = sum > 0 ? weightedSum / sum : 0;
    }

    return centroids;
  }

  /**
   * Compute RMS sequence
   * @param {Float32Array} channelData 
   * @returns {Float32Array}
   */
  computeRMSSequence(channelData) {
    const frameSize = 2048;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
    const rms = new Float32Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      let sum = 0;
      for (let j = start; j < start + frameSize && j < channelData.length; j++) {
        sum += channelData[j] * channelData[j];
      }
      rms[i] = Math.sqrt(sum / frameSize);
    }

    return rms;
  }
}
