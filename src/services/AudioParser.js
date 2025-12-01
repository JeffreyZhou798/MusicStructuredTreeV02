/**
 * Audio Parser - Decodes MP3 files and extracts audio features
 */
export class AudioParser {
  constructor() {
    this.audioContext = null;
  }

  /**
   * Get or create AudioContext
   * @returns {AudioContext}
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Decode MP3 file to AudioBuffer
   * @param {File} file - MP3 audio file
   * @returns {Promise<AudioBuffer>}
   */
  async decode(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = this.getAudioContext();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      throw new Error('Failed to decode audio file: ' + error.message);
    }
  }

  /**
   * Extract low-level audio features
   * @param {AudioBuffer} buffer - Audio buffer
   * @returns {Promise<AudioFeatures>}
   */
  async extractFeatures(buffer) {
    const channelData = buffer.getChannelData(0); // Use first channel
    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;

    // Frame parameters
    const frameSize = 2048;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

    const features = {
      mfcc: [],
      chroma: [],
      spectralCentroid: new Float32Array(numFrames),
      rms: new Float32Array(numFrames),
      sampleRate,
      duration
    };

    // Process frames
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      
      // RMS energy
      features.rms[i] = this.computeRMS(frame);
      
      // Spectral features (simplified)
      const spectrum = this.computeSpectrum(frame);
      features.spectralCentroid[i] = this.computeSpectralCentroid(spectrum, sampleRate);
      
      // Chroma features
      features.chroma.push(this.computeChroma(spectrum, sampleRate));
    }

    return features;
  }

  /**
   * Compute RMS energy of a frame
   * @param {Float32Array} frame 
   * @returns {number}
   */
  computeRMS(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }

  /**
   * Compute magnitude spectrum using FFT
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

    // Simple DFT (for production, use FFT library)
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
   * Compute spectral centroid
   * @param {Float32Array} spectrum 
   * @param {number} sampleRate 
   * @returns {number}
   */
  computeSpectralCentroid(spectrum, sampleRate) {
    let weightedSum = 0;
    let sum = 0;
    const binWidth = sampleRate / (spectrum.length * 2);

    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * binWidth;
      weightedSum += frequency * spectrum[i];
      sum += spectrum[i];
    }

    return sum > 0 ? weightedSum / sum : 0;
  }

  /**
   * Compute chroma features (12-dimensional pitch class)
   * @param {Float32Array} spectrum 
   * @param {number} sampleRate 
   * @returns {Float32Array}
   */
  computeChroma(spectrum, sampleRate) {
    const chroma = new Float32Array(12);
    const binWidth = sampleRate / (spectrum.length * 2);
    const minFreq = 65.41; // C2
    const maxFreq = 2093.0; // C7

    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * binWidth;
      if (frequency >= minFreq && frequency <= maxFreq) {
        // Convert frequency to pitch class
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
   * Resample audio to target sample rate
   * @param {AudioBuffer} buffer 
   * @param {number} targetSampleRate 
   * @returns {Promise<AudioBuffer>}
   */
  async resample(buffer, targetSampleRate = 16000) {
    if (buffer.sampleRate === targetSampleRate) {
      return buffer;
    }

    const offlineContext = new OfflineAudioContext(
      1, // mono
      Math.ceil(buffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();

    return offlineContext.startRendering();
  }

  /**
   * Convert AudioBuffer to mono
   * @param {AudioBuffer} buffer 
   * @returns {Float32Array}
   */
  toMono(buffer) {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    }

    const mono = new Float32Array(buffer.length);
    const channels = [];
    
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (let c = 0; c < channels.length; c++) {
        sum += channels[c][i];
      }
      mono[i] = sum / channels.length;
    }

    return mono;
  }

  /**
   * Detect onsets in audio
   * @param {AudioBuffer} buffer 
   * @returns {number[]} Onset times in seconds
   */
  detectOnsets(buffer) {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const frameSize = 1024;
    const hopSize = 256;
    const onsets = [];

    let prevEnergy = 0;
    const threshold = 0.1;

    for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
      const frame = channelData.slice(i, i + frameSize);
      const energy = this.computeRMS(frame);
      
      // Simple onset detection: energy increase
      if (energy > prevEnergy + threshold && energy > 0.01) {
        const time = i / sampleRate;
        // Avoid detecting onsets too close together
        if (onsets.length === 0 || time - onsets[onsets.length - 1] > 0.05) {
          onsets.push(time);
        }
      }
      
      prevEnergy = energy;
    }

    return onsets;
  }

  /**
   * Close audio context
   */
  close() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
