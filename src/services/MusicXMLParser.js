import JSZip from 'jszip';

/**
 * MusicXML Parser - Parses MusicXML files and extracts musical information
 */
export class MusicXMLParser {
  /**
   * Parse MusicXML file
   * @param {File} file - MusicXML file (.mxl or .musicxml)
   * @returns {Promise<ParsedScore>}
   */
  async parse(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    let xmlContent;

    if (extension === 'mxl') {
      xmlContent = await this.extractFromMXL(file);
    } else {
      xmlContent = await file.text();
    }

    return this.parseXML(xmlContent);
  }

  /**
   * Extract XML content from compressed MXL file
   * @param {File} file 
   * @returns {Promise<string>}
   */
  async extractFromMXL(file) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Find the root file from META-INF/container.xml
    let rootFile = null;
    
    if (contents.files['META-INF/container.xml']) {
      const containerXml = await contents.files['META-INF/container.xml'].async('text');
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXml, 'text/xml');
      const rootFileElement = containerDoc.querySelector('rootfile');
      if (rootFileElement) {
        rootFile = rootFileElement.getAttribute('full-path');
      }
    }

    // Fallback: look for .xml files
    if (!rootFile) {
      for (const filename of Object.keys(contents.files)) {
        if (filename.endsWith('.xml') && !filename.startsWith('META-INF')) {
          rootFile = filename;
          break;
        }
      }
    }

    if (!rootFile || !contents.files[rootFile]) {
      throw new Error('Could not find MusicXML content in MXL file');
    }

    return contents.files[rootFile].async('text');
  }

  /**
   * Parse XML content into structured data
   * @param {string} xmlContent 
   * @returns {ParsedScore}
   */
  parseXML(xmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML: ' + parseError.textContent);
    }

    const score = {
      xmlContent,
      title: this.extractTitle(doc),
      composer: this.extractComposer(doc),
      parts: this.extractParts(doc),
      measures: [],
      keySignatures: [],
      timeSignatures: [],
      tempo: []
    };

    // Extract measures from all parts
    score.measures = this.extractMeasures(doc);
    score.keySignatures = this.extractKeySignatures(doc);
    score.timeSignatures = this.extractTimeSignatures(doc);
    score.tempo = this.extractTempo(doc);

    return score;
  }

  /**
   * Extract title from work or movement-title
   * @param {Document} doc 
   * @returns {string}
   */
  extractTitle(doc) {
    const workTitle = doc.querySelector('work-title');
    if (workTitle) return workTitle.textContent;
    
    const movementTitle = doc.querySelector('movement-title');
    if (movementTitle) return movementTitle.textContent;
    
    return 'Untitled';
  }

  /**
   * Extract composer from identification
   * @param {Document} doc 
   * @returns {string}
   */
  extractComposer(doc) {
    const creator = doc.querySelector('creator[type="composer"]');
    if (creator) return creator.textContent;
    
    const anyCreator = doc.querySelector('creator');
    if (anyCreator) return anyCreator.textContent;
    
    return 'Unknown';
  }

  /**
   * Extract part information
   * @param {Document} doc 
   * @returns {Part[]}
   */
  extractParts(doc) {
    const parts = [];
    const partList = doc.querySelectorAll('part-list score-part');
    
    partList.forEach(part => {
      parts.push({
        id: part.getAttribute('id'),
        name: part.querySelector('part-name')?.textContent || 'Part'
      });
    });

    return parts;
  }

  /**
   * Extract all measures with notes
   * @param {Document} doc 
   * @returns {Measure[]}
   */
  extractMeasures(doc) {
    const measures = [];
    const partElements = doc.querySelectorAll('part');
    
    // Use first part for primary analysis
    const primaryPart = partElements[0];
    if (!primaryPart) return measures;

    const measureElements = primaryPart.querySelectorAll('measure');
    let currentTime = 0;
    let divisions = 1;
    let beatsPerMeasure = 4;
    let beatType = 4;

    measureElements.forEach((measureEl, index) => {
      const measureNum = parseInt(measureEl.getAttribute('number')) || index + 1;
      
      // Check for divisions change
      const divisionsEl = measureEl.querySelector('attributes divisions');
      if (divisionsEl) {
        divisions = parseInt(divisionsEl.textContent) || 1;
      }

      // Check for time signature change
      const timeEl = measureEl.querySelector('attributes time');
      if (timeEl) {
        beatsPerMeasure = parseInt(timeEl.querySelector('beats')?.textContent) || 4;
        beatType = parseInt(timeEl.querySelector('beat-type')?.textContent) || 4;
      }

      const notes = this.extractNotesFromMeasure(measureEl, divisions, currentTime);
      const chords = this.extractChordsFromMeasure(measureEl);
      
      const measureDuration = (beatsPerMeasure / beatType) * 4; // in quarter notes
      const measureDurationSeconds = measureDuration * 0.5; // assuming 120 BPM default

      measures.push({
        number: measureNum,
        notes,
        chords,
        startTime: currentTime,
        endTime: currentTime + measureDurationSeconds,
        divisions,
        beatsPerMeasure,
        beatType
      });

      currentTime += measureDurationSeconds;
    });

    return measures;
  }

  /**
   * Extract notes from a measure
   * @param {Element} measureEl 
   * @param {number} divisions 
   * @param {number} measureStartTime 
   * @returns {Note[]}
   */
  extractNotesFromMeasure(measureEl, divisions, measureStartTime) {
    const notes = [];
    const noteElements = measureEl.querySelectorAll('note');
    let currentOffset = 0;

    noteElements.forEach(noteEl => {
      // Skip rest notes for melodic analysis
      if (noteEl.querySelector('rest')) {
        const duration = parseInt(noteEl.querySelector('duration')?.textContent) || 0;
        if (!noteEl.querySelector('chord')) {
          currentOffset += duration;
        }
        return;
      }

      const pitch = noteEl.querySelector('pitch');
      if (!pitch) return;

      const step = pitch.querySelector('step')?.textContent || 'C';
      const octave = parseInt(pitch.querySelector('octave')?.textContent) || 4;
      const alter = parseInt(pitch.querySelector('alter')?.textContent) || 0;
      
      const midiPitch = this.stepToMidi(step, octave, alter);
      const duration = parseInt(noteEl.querySelector('duration')?.textContent) || divisions;
      const durationSeconds = (duration / divisions) * 0.5; // assuming 120 BPM

      // Check if this is a chord note (simultaneous with previous)
      const isChord = noteEl.querySelector('chord') !== null;
      
      const startTime = measureStartTime + (currentOffset / divisions) * 0.5;

      notes.push({
        pitch: midiPitch,
        step,
        octave,
        alter,
        startTime,
        endTime: startTime + durationSeconds,
        duration: durationSeconds,
        velocity: 80, // default velocity
        isChord
      });

      if (!isChord) {
        currentOffset += duration;
      }
    });

    return notes;
  }

  /**
   * Extract chord symbols from measure
   * @param {Element} measureEl 
   * @returns {Chord[]}
   */
  extractChordsFromMeasure(measureEl) {
    const chords = [];
    const harmonyElements = measureEl.querySelectorAll('harmony');

    harmonyElements.forEach(harmonyEl => {
      const root = harmonyEl.querySelector('root root-step')?.textContent || 'C';
      const rootAlter = parseInt(harmonyEl.querySelector('root root-alter')?.textContent) || 0;
      const kind = harmonyEl.querySelector('kind')?.textContent || 'major';
      const bass = harmonyEl.querySelector('bass bass-step')?.textContent;

      chords.push({
        root: this.applyAlter(root, rootAlter),
        kind: this.normalizeChordKind(kind),
        bass: bass || null
      });
    });

    return chords;
  }

  /**
   * Extract key signatures
   * @param {Document} doc 
   * @returns {KeySignature[]}
   */
  extractKeySignatures(doc) {
    const keySignatures = [];
    const keyElements = doc.querySelectorAll('attributes key');

    keyElements.forEach((keyEl, index) => {
      const fifths = parseInt(keyEl.querySelector('fifths')?.textContent) || 0;
      const mode = keyEl.querySelector('mode')?.textContent || 'major';
      
      keySignatures.push({
        fifths,
        mode,
        measureIndex: index // simplified - would need proper measure tracking
      });
    });

    return keySignatures;
  }

  /**
   * Extract time signatures
   * @param {Document} doc 
   * @returns {TimeSignature[]}
   */
  extractTimeSignatures(doc) {
    const timeSignatures = [];
    const timeElements = doc.querySelectorAll('attributes time');

    timeElements.forEach((timeEl, index) => {
      const beats = parseInt(timeEl.querySelector('beats')?.textContent) || 4;
      const beatType = parseInt(timeEl.querySelector('beat-type')?.textContent) || 4;
      
      timeSignatures.push({
        beats,
        beatType,
        measureIndex: index
      });
    });

    return timeSignatures;
  }

  /**
   * Extract tempo markings
   * @param {Document} doc 
   * @returns {Tempo[]}
   */
  extractTempo(doc) {
    const tempos = [];
    const soundElements = doc.querySelectorAll('sound[tempo]');

    soundElements.forEach(soundEl => {
      const tempo = parseFloat(soundEl.getAttribute('tempo')) || 120;
      tempos.push({ bpm: tempo });
    });

    // Default tempo if none found
    if (tempos.length === 0) {
      tempos.push({ bpm: 120 });
    }

    return tempos;
  }

  /**
   * Convert step/octave/alter to MIDI pitch
   * @param {string} step 
   * @param {number} octave 
   * @param {number} alter 
   * @returns {number}
   */
  stepToMidi(step, octave, alter) {
    const stepMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const basePitch = stepMap[step.toUpperCase()] || 0;
    return (octave + 1) * 12 + basePitch + alter;
  }

  /**
   * Apply alter to note name
   * @param {string} note 
   * @param {number} alter 
   * @returns {string}
   */
  applyAlter(note, alter) {
    if (alter === 1) return note + '#';
    if (alter === -1) return note + 'b';
    return note;
  }

  /**
   * Normalize chord kind to standard format
   * @param {string} kind 
   * @returns {string}
   */
  normalizeChordKind(kind) {
    const kindMap = {
      'major': 'major',
      'minor': 'minor',
      'dominant': 'dominant',
      'diminished': 'diminished',
      'augmented': 'augmented',
      'major-seventh': 'maj7',
      'minor-seventh': 'min7',
      'dominant-seventh': '7',
      'diminished-seventh': 'dim7',
      'half-diminished': 'm7b5'
    };
    return kindMap[kind] || kind;
  }

  /**
   * Convert parsed score to Magenta NoteSequence format
   * @param {ParsedScore} score 
   * @returns {NoteSequence}
   */
  toNoteSequence(score) {
    const notes = [];
    let totalTime = 0;

    score.measures.forEach(measure => {
      measure.notes.forEach(note => {
        notes.push({
          pitch: note.pitch,
          velocity: note.velocity,
          startTime: note.startTime,
          endTime: note.endTime,
          instrument: 0,
          program: 0
        });
        totalTime = Math.max(totalTime, note.endTime);
      });
    });

    return {
      notes,
      totalTime,
      tempos: score.tempo.map(t => ({ time: 0, qpm: t.bpm })),
      keySignatures: score.keySignatures.map(k => ({
        time: 0,
        key: k.fifths,
        mode: k.mode === 'major' ? 0 : 1
      })),
      timeSignatures: score.timeSignatures.map(t => ({
        time: 0,
        numerator: t.beats,
        denominator: t.beatType
      }))
    };
  }

  /**
   * Extract harmonic information for cadence detection
   * @param {ParsedScore} score 
   * @returns {HarmonicAnalysis}
   */
  extractHarmony(score) {
    const chordProgressions = [];
    let currentKey = score.keySignatures[0] || { fifths: 0, mode: 'major' };

    score.measures.forEach(measure => {
      if (measure.chords.length > 0) {
        chordProgressions.push({
          measureNumber: measure.number,
          chords: measure.chords,
          key: currentKey
        });
      }
    });

    return {
      keySignatures: score.keySignatures,
      chordProgressions,
      estimatedKey: this.estimateKey(score)
    };
  }

  /**
   * Estimate the key of the piece
   * @param {ParsedScore} score 
   * @returns {object}
   */
  estimateKey(score) {
    // Simple key estimation based on first and last notes/chords
    if (score.keySignatures.length > 0) {
      const ks = score.keySignatures[0];
      const keyNames = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
      const index = ks.fifths >= 0 ? ks.fifths : 14 + ks.fifths;
      return {
        tonic: keyNames[index] || 'C',
        mode: ks.mode
      };
    }
    return { tonic: 'C', mode: 'major' };
  }
}
