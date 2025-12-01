import { MusicXMLParser } from './MusicXMLParser';
import { AudioParser } from './AudioParser';
import { SymbolicFeatureExtractor } from './FeatureExtractor';
import { RuleEngine } from './RuleEngine';
import { ColorMapper } from './ColorMapper';

/**
 * Analysis Pipeline - Orchestrates the complete analysis workflow
 * 
 * Implements intelligent music structure analysis based on:
 * - 曲式学 (Theory of Musical Form)
 * - 终止式 (Cadence) detection for phrase boundaries
 * - 乐句/乐段 (Phrase/Period) structure recognition
 * - 发展手法 (Development techniques) classification
 */
export class AnalysisPipeline {
  constructor(store) {
    this.store = store;
    this.musicXMLParser = new MusicXMLParser();
    this.audioParser = new AudioParser();
    this.featureExtractor = new SymbolicFeatureExtractor();
    this.ruleEngine = new RuleEngine(store.ruleConfig);
    this.colorMapper = new ColorMapper();
  }

  async analyze(options) {
    const { musicXML, mp3, lightweight } = options;
    
    try {
      this.store.setProcessing(true, 'Initializing...', 0);

      let parsedScore = null;
      let audioBuffer = null;
      let noteSequence = null;

      if (musicXML) {
        this.store.updateProgress(10, 'Parsing MusicXML...');
        parsedScore = await this.musicXMLParser.parse(musicXML);
        this.store.setParsedScore(parsedScore);
        noteSequence = this.musicXMLParser.toNoteSequence(parsedScore);
        this.store.setNoteSequence(noteSequence);
      }

      if (mp3 && !lightweight) {
        this.store.updateProgress(20, 'Decoding audio...');
        audioBuffer = await this.audioParser.decode(mp3);
        this.store.setAudioBuffer(audioBuffer);
      }

      // Step 2: Intelligent segmentation based on music theory
      this.store.updateProgress(30, 'Analyzing phrase structure...');
      const segments = this.intelligentSegmentation(parsedScore, noteSequence);

      // Step 3: Extract features for each segment
      this.store.updateProgress(40, 'Extracting musical features...');
      const segmentsWithFeatures = this.extractSegmentFeatures(segments, noteSequence);

      // Step 4: Generate embeddings
      this.store.updateProgress(50, 'Generating embeddings...');
      const embeddings = this.generateEmbeddings(segmentsWithFeatures);

      // Step 5: Compute similarity matrix
      this.store.updateProgress(60, 'Computing similarities...');
      const similarityMatrix = this.computeSimilarityMatrix(embeddings);

      // Step 6: Generate merge proposals based on music theory
      this.store.updateProgress(70, 'Analyzing structure relationships...');
      const proposals = this.generateIntelligentProposals(segmentsWithFeatures, similarityMatrix);

      // Step 7: Validate with rule engine
      this.store.updateProgress(80, 'Validating with music theory rules...');
      const validatedProposals = this.ruleEngine.validateAll(proposals);

      // Step 8: Build hierarchical structure tree
      this.store.updateProgress(90, 'Building structure tree...');
      const structureTree = this.buildHierarchicalTree(segmentsWithFeatures, validatedProposals);

      // Step 9: Generate color scheme
      this.store.updateProgress(95, 'Generating visualization...');
      const colorScheme = this.colorMapper.generateColorScheme(structureTree, embeddings);
      this.applyColorsToTree(structureTree, colorScheme);

      // Store results
      this.store.setStructureTree(structureTree);
      this.store.setEmbeddings(embeddings);
      this.store.setColorScheme(colorScheme);

      this.store.updateProgress(100, 'Analysis complete');

    } catch (error) {
      console.error('Analysis pipeline error:', error);
      throw error;
    }
  }

  /**
   * Intelligent segmentation based on music theory
   * Uses cadence detection and phrase structure analysis
   */
  intelligentSegmentation(parsedScore, noteSequence) {
    const segments = [];
    
    if (!parsedScore || !parsedScore.measures) {
      return segments;
    }

    const measures = parsedScore.measures;
    const totalMeasures = measures.length;

    // First pass: detect potential phrase boundaries using cadences
    const boundaries = this.detectPhraseBoundaries(measures);
    
    // Second pass: create segments based on boundaries
    let segmentId = 0;
    let startIdx = 0;

    for (const boundaryIdx of boundaries) {
      if (boundaryIdx > startIdx) {
        const segment = this.createSegment(
          measures, startIdx, boundaryIdx, segmentId++
        );
        segments.push(segment);
        startIdx = boundaryIdx + 1;
      }
    }

    // Handle remaining measures
    if (startIdx < totalMeasures) {
      const segment = this.createSegment(
        measures, startIdx, totalMeasures - 1, segmentId++
      );
      segments.push(segment);
    }

    // If no boundaries detected, fall back to intelligent chunking
    if (segments.length === 0) {
      return this.fallbackSegmentation(measures);
    }

    return segments;
  }

  /**
   * Detect phrase boundaries using music theory principles
   */
  detectPhraseBoundaries(measures) {
    const boundaries = [];
    
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      
      // Check for cadence indicators
      if (this.hasCadenceIndicator(measure, measures, i)) {
        boundaries.push(i);
        continue;
      }

      // Check for rhythmic closure (long note at end)
      if (this.hasRhythmicClosure(measure)) {
        boundaries.push(i);
        continue;
      }

      // Check for typical phrase lengths (4, 8 bars)
      if ((i + 1) % 4 === 0 && this.hasWeakBoundary(measure, measures, i)) {
        boundaries.push(i);
      }
    }

    // Ensure minimum segment size
    return this.filterBoundaries(boundaries, measures.length);
  }

  hasCadenceIndicator(measure, measures, idx) {
    if (!measure.notes || measure.notes.length === 0) return false;

    const notes = measure.notes;
    const lastNote = notes[notes.length - 1];
    
    // Check for long final note (typical cadence)
    const avgDuration = notes.reduce((sum, n) => 
      sum + (n.endTime - n.startTime), 0) / notes.length;
    const lastDuration = lastNote.endTime - lastNote.startTime;
    
    if (lastDuration > avgDuration * 1.5) {
      return true;
    }

    // Check for rest after notes
    if (measure.endTime - lastNote.endTime > avgDuration * 0.5) {
      return true;
    }

    // Check for melodic descent to tonic
    if (notes.length >= 2) {
      const lastPitches = notes.slice(-2).map(n => n.pitch);
      const interval = lastPitches[1] - lastPitches[0];
      // Stepwise descent
      if (interval >= -2 && interval < 0) {
        return true;
      }
    }

    return false;
  }

  hasRhythmicClosure(measure) {
    if (!measure.notes || measure.notes.length === 0) return false;
    
    const notes = measure.notes;
    const lastNote = notes[notes.length - 1];
    const measureDuration = measure.endTime - measure.startTime;
    const lastNoteEnd = lastNote.endTime - measure.startTime;
    
    // Check if last note extends to near end of measure
    return lastNoteEnd > measureDuration * 0.8;
  }

  hasWeakBoundary(measure, measures, idx) {
    // Check for texture change
    if (idx + 1 < measures.length) {
      const nextMeasure = measures[idx + 1];
      const currentDensity = measure.notes?.length || 0;
      const nextDensity = nextMeasure.notes?.length || 0;
      
      // Significant change in note density
      if (Math.abs(currentDensity - nextDensity) > 3) {
        return true;
      }
    }
    
    return false;
  }

  filterBoundaries(boundaries, totalMeasures) {
    const filtered = [];
    let lastBoundary = -1;
    const minSegmentSize = 2;

    for (const boundary of boundaries) {
      if (boundary - lastBoundary >= minSegmentSize) {
        filtered.push(boundary);
        lastBoundary = boundary;
      }
    }

    return filtered;
  }

  createSegment(measures, startIdx, endIdx, segmentId) {
    const startMeasure = measures[startIdx];
    const endMeasure = measures[endIdx];

    const segmentNotes = [];
    for (let j = startIdx; j <= endIdx; j++) {
      if (measures[j].notes) {
        segmentNotes.push(...measures[j].notes);
      }
    }

    return {
      id: `seg_${segmentId}`,
      type: 'leaf',
      startBar: startMeasure.number,
      endBar: endMeasure.number,
      startTime: startMeasure.startTime,
      endTime: endMeasure.endTime,
      notes: segmentNotes,
      children: []
    };
  }

  fallbackSegmentation(measures) {
    const segments = [];
    const totalMeasures = measures.length;
    let segmentId = 0;

    // Use adaptive segment sizes based on total length
    let segmentSize = 4; // Default to 4-bar phrases
    if (totalMeasures <= 8) segmentSize = 2;
    else if (totalMeasures <= 16) segmentSize = 4;
    else if (totalMeasures <= 32) segmentSize = 4;
    else segmentSize = 8;

    for (let i = 0; i < totalMeasures; i += segmentSize) {
      const endIdx = Math.min(i + segmentSize - 1, totalMeasures - 1);
      segments.push(this.createSegment(measures, i, endIdx, segmentId++));
    }

    return segments;
  }


  /**
   * Extract features for each segment
   */
  extractSegmentFeatures(segments, noteSequence) {
    return segments.map(segment => {
      const features = this.featureExtractor.extract({
        notes: segment.notes,
        totalTime: segment.endTime - segment.startTime
      });

      // Enhanced cadence detection
      const cadenceInfo = this.detectCadence(segment);
      features.hasCadence = cadenceInfo.detected;
      features.cadenceType = cadenceInfo.type;
      features.cadenceStrength = cadenceInfo.strength;

      // Predict level based on music theory
      const levelPrediction = this.ruleEngine.predictLevel({
        ...segment,
        features
      });

      return {
        ...segment,
        features,
        type: levelPrediction.level,
        level: levelPrediction.level,
        confidence: levelPrediction.confidence
      };
    });
  }

  detectCadence(segment) {
    if (!segment.notes || segment.notes.length < 3) {
      return { detected: false };
    }

    const notes = segment.notes;
    const lastNotes = notes.slice(-4);
    
    // Check for rhythmic lengthening
    const avgDuration = notes.reduce((sum, n) => 
      sum + (n.endTime - n.startTime), 0) / notes.length;
    const lastDuration = lastNotes[lastNotes.length - 1].endTime - 
                         lastNotes[lastNotes.length - 1].startTime;
    
    const hasLengthening = lastDuration > avgDuration * 1.3;

    // Check for melodic descent
    const lastPitches = lastNotes.map(n => n.pitch);
    let descendingCount = 0;
    for (let i = 1; i < lastPitches.length; i++) {
      if (lastPitches[i] < lastPitches[i-1]) descendingCount++;
    }
    const hasDescent = descendingCount >= lastPitches.length * 0.5;

    // Determine cadence type and strength
    if (hasLengthening && hasDescent) {
      return { detected: true, type: 'perfect', strength: 'strong' };
    } else if (hasLengthening) {
      return { detected: true, type: 'half', strength: 'moderate' };
    } else if (hasDescent) {
      return { detected: true, type: 'weak', strength: 'weak' };
    }

    return { detected: false };
  }

  /**
   * Generate embeddings from features
   */
  generateEmbeddings(segments) {
    const embeddings = new Map();

    segments.forEach(segment => {
      const features = segment.features;
      const embedding = new Float32Array(24);

      // Pitch class histogram (12 dims)
      if (features.pitchClassHistogram) {
        for (let i = 0; i < 12; i++) {
          embedding[i] = features.pitchClassHistogram[i] || 0;
        }
      }

      // Normalized features (12 dims)
      embedding[12] = (features.averagePitch || 60) / 127;
      embedding[13] = (features.pitchRange || 12) / 48;
      embedding[14] = (features.noteCount || 10) / 50;
      embedding[15] = (features.duration || 4) / 10;
      embedding[16] = (features.averageVelocity || 64) / 127;
      embedding[17] = (features.averageDuration || 0.5) / 2;
      embedding[18] = (features.pitchVariance || 10) / 100;
      embedding[19] = (features.rhythmVariance || 0.1) / 1;

      // Contour summary (4 dims)
      const contour = features.intervalContour || [];
      embedding[20] = contour.length > 0 ? Math.max(...contour) / 12 : 0;
      embedding[21] = contour.length > 0 ? Math.min(...contour) / 12 : 0;
      embedding[22] = contour.filter(i => i > 0).length / (contour.length || 1);
      embedding[23] = contour.filter(i => i < 0).length / (contour.length || 1);

      embeddings.set(segment.id, embedding);
    });

    return embeddings;
  }

  /**
   * Compute similarity matrix
   */
  computeSimilarityMatrix(embeddings) {
    const matrix = new Map();
    const ids = Array.from(embeddings.keys());

    for (const id1 of ids) {
      const row = new Map();
      const emb1 = embeddings.get(id1);

      for (const id2 of ids) {
        if (id1 === id2) {
          row.set(id2, 1.0);
        } else {
          const emb2 = embeddings.get(id2);
          row.set(id2, this.cosineSimilarity(emb1, emb2));
        }
      }

      matrix.set(id1, row);
    }

    return matrix;
  }

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

  /**
   * Generate intelligent merge proposals based on music theory
   */
  generateIntelligentProposals(segments, similarityMatrix) {
    const proposals = [];

    // Adjacent segment proposals (for phrase building)
    for (let i = 0; i < segments.length - 1; i++) {
      const segA = segments[i];
      const segB = segments[i + 1];
      const similarity = similarityMatrix.get(segA.id)?.get(segB.id) || 0;

      proposals.push({
        nodeA: segA,
        nodeB: segB,
        similarity,
        type: 'adjacent',
        priority: 1
      });
    }

    // Non-adjacent similar segments (for recurrence detection)
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 2; j < segments.length; j++) {
        const segA = segments[i];
        const segB = segments[j];
        const similarity = similarityMatrix.get(segA.id)?.get(segB.id) || 0;

        if (similarity > 0.75) {
          proposals.push({
            nodeA: segA,
            nodeB: segB,
            similarity,
            type: 'recurrence',
            priority: 2
          });
        }
      }
    }

    // Sort by priority and similarity
    proposals.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.similarity - a.similarity;
    });

    return proposals;
  }


  /**
   * Build hierarchical structure tree based on music theory
   * Implements bottom-up construction following:
   * Motif → Sub-phrase → Phrase → Period → Theme → Section → Movement → Root
   */
  buildHierarchicalTree(segments, proposals) {
    // Start with leaf nodes
    const nodes = segments.map(seg => ({
      ...seg,
      children: [],
      parent: null,
      relationType: null,
      ruleEvaluations: []
    }));

    // Filter accepted adjacent merges
    const acceptedMerges = proposals.filter(p => 
      p.validation.decision === 'accept' && p.type === 'adjacent'
    );

    // Sort by position
    acceptedMerges.sort((a, b) => a.nodeA.startBar - b.nodeA.startBar);

    // Build hierarchy level by level
    const levelProgression = [
      'motif', 'subphrase', 'phrase', 'period', 'theme', 'section', 'movement'
    ];
    
    let currentLevel = [...nodes];
    let levelIndex = 0;

    while (currentLevel.length > 1 && levelIndex < levelProgression.length) {
      const nextLevel = [];
      let i = 0;

      while (i < currentLevel.length) {
        // Try to merge with next node based on music theory rules
        if (i + 1 < currentLevel.length) {
          const nodeA = currentLevel[i];
          const nodeB = currentLevel[i + 1];

          // Find corresponding proposal
          const proposal = this.findMatchingProposal(acceptedMerges, nodeA, nodeB);

          if (proposal && this.shouldMerge(nodeA, nodeB, proposal, levelIndex)) {
            // Create merged node
            const mergedNode = this.createMergedNode(
              nodeA, nodeB, proposal, levelProgression[levelIndex + 1]
            );

            nodeA.parent = mergedNode.id;
            nodeB.parent = mergedNode.id;

            nextLevel.push(mergedNode);
            i += 2;
            continue;
          }
        }

        // No merge - keep node as is, possibly upgrade level
        const upgradedNode = this.maybeUpgradeLevel(currentLevel[i], levelIndex);
        nextLevel.push(upgradedNode);
        i++;
      }

      // Only advance level if we made progress
      if (nextLevel.length < currentLevel.length) {
        currentLevel = nextLevel;
        levelIndex++;
      } else {
        // Force merge remaining nodes if stuck
        currentLevel = this.forceMergeRemaining(currentLevel, levelProgression[levelIndex + 1]);
        levelIndex++;
      }
    }

    // Create root node
    const root = {
      id: 'root',
      type: 'root',
      level: 'root',
      startBar: Math.min(...currentLevel.map(n => n.startBar)),
      endBar: Math.max(...currentLevel.map(n => n.endBar)),
      startTime: Math.min(...currentLevel.map(n => n.startTime)),
      endTime: Math.max(...currentLevel.map(n => n.endTime)),
      children: currentLevel,
      confidence: 1.0,
      relationType: null,
      ruleEvaluations: [],
      features: {}
    };

    currentLevel.forEach(node => {
      node.parent = 'root';
    });

    return root;
  }

  findMatchingProposal(proposals, nodeA, nodeB) {
    return proposals.find(p =>
      (p.nodeA.id === nodeA.id && p.nodeB.id === nodeB.id) ||
      (p.nodeA.id === nodeB.id && p.nodeB.id === nodeA.id) ||
      // Also match by bar range for merged nodes
      (p.nodeA.startBar === nodeA.startBar && p.nodeB.endBar === nodeB.endBar)
    );
  }

  shouldMerge(nodeA, nodeB, proposal, levelIndex) {
    // Check validation score
    if (proposal.validation.score < 0.5) return false;

    // Check if merged size is appropriate for next level
    const mergedBars = nodeB.endBar - nodeA.startBar + 1;
    const typicalSizes = {
      0: 4,   // motif -> subphrase
      1: 8,   // subphrase -> phrase
      2: 16,  // phrase -> period
      3: 32,  // period -> theme
      4: 64,  // theme -> section
      5: 128  // section -> movement
    };

    const targetSize = typicalSizes[levelIndex] || 16;
    const sizeRatio = mergedBars / targetSize;

    // Allow some flexibility in size
    return sizeRatio >= 0.5 && sizeRatio <= 2.0;
  }

  createMergedNode(nodeA, nodeB, proposal, level) {
    return {
      id: `merged_${nodeA.id}_${nodeB.id}`,
      type: level,
      level: level,
      startBar: Math.min(nodeA.startBar, nodeB.startBar),
      endBar: Math.max(nodeA.endBar, nodeB.endBar),
      startTime: Math.min(nodeA.startTime, nodeB.startTime),
      endTime: Math.max(nodeA.endTime, nodeB.endTime),
      children: [nodeA, nodeB],
      confidence: proposal.validation.score,
      relationType: proposal.validation.relationType,
      ruleEvaluations: proposal.validation.evidence,
      features: this.mergeFeatures(nodeA.features, nodeB.features)
    };
  }

  maybeUpgradeLevel(node, currentLevelIndex) {
    // Check if node should be upgraded based on its size
    const bars = node.endBar - node.startBar + 1;
    const levels = ['motif', 'subphrase', 'phrase', 'period', 'theme', 'section'];
    
    let appropriateLevel = 'motif';
    if (bars >= 32) appropriateLevel = 'section';
    else if (bars >= 16) appropriateLevel = 'theme';
    else if (bars >= 8) appropriateLevel = 'period';
    else if (bars >= 4) appropriateLevel = 'phrase';
    else if (bars >= 2) appropriateLevel = 'subphrase';

    const appropriateLevelIndex = levels.indexOf(appropriateLevel);
    if (appropriateLevelIndex > currentLevelIndex) {
      return {
        ...node,
        type: appropriateLevel,
        level: appropriateLevel
      };
    }

    return node;
  }

  forceMergeRemaining(nodes, level) {
    if (nodes.length <= 1) return nodes;

    const merged = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        const nodeA = nodes[i];
        const nodeB = nodes[i + 1];
        
        merged.push({
          id: `forced_${nodeA.id}_${nodeB.id}`,
          type: level,
          level: level,
          startBar: Math.min(nodeA.startBar, nodeB.startBar),
          endBar: Math.max(nodeA.endBar, nodeB.endBar),
          startTime: Math.min(nodeA.startTime, nodeB.startTime),
          endTime: Math.max(nodeA.endTime, nodeB.endTime),
          children: [nodeA, nodeB],
          confidence: 0.5,
          relationType: 'grouped',
          ruleEvaluations: [],
          features: this.mergeFeatures(nodeA.features, nodeB.features)
        });

        nodeA.parent = merged[merged.length - 1].id;
        nodeB.parent = merged[merged.length - 1].id;
      } else {
        merged.push(nodes[i]);
      }
    }

    return merged;
  }

  mergeFeatures(featuresA, featuresB) {
    if (!featuresA) return featuresB || {};
    if (!featuresB) return featuresA;

    return {
      noteCount: (featuresA.noteCount || 0) + (featuresB.noteCount || 0),
      duration: (featuresA.duration || 0) + (featuresB.duration || 0),
      averagePitch: ((featuresA.averagePitch || 0) + (featuresB.averagePitch || 0)) / 2,
      pitchRange: Math.max(featuresA.pitchRange || 0, featuresB.pitchRange || 0),
      hasCadence: featuresB.hasCadence || false,
      cadenceType: featuresB.cadenceType || null,
      pitchClassHistogram: this.mergeHistograms(
        featuresA.pitchClassHistogram,
        featuresB.pitchClassHistogram
      )
    };
  }

  mergeHistograms(histA, histB) {
    if (!histA) return histB || new Array(12).fill(0);
    if (!histB) return histA;

    const merged = new Array(12);
    for (let i = 0; i < 12; i++) {
      merged[i] = ((histA[i] || 0) + (histB[i] || 0)) / 2;
    }
    return merged;
  }

  applyColorsToTree(tree, colorScheme) {
    const applyColor = (node) => {
      node.color = colorScheme.nodeColors.get(node.id) || this.getDefaultColor(node.type);
      if (node.children) {
        node.children.forEach(applyColor);
      }
    };

    applyColor(tree);
  }

  getDefaultColor(type) {
    const colorMap = {
      'motif': 'hsl(120, 50%, 75%)',
      'motive': 'hsl(120, 50%, 75%)',
      'leaf': 'hsl(120, 50%, 65%)',
      'subphrase': 'hsl(120, 50%, 65%)',
      'phrase': 'hsl(120, 50%, 55%)',
      'period': 'hsl(120, 50%, 45%)',
      'branch': 'hsl(120, 50%, 45%)',
      'theme': 'hsl(120, 50%, 40%)',
      'section': 'hsl(120, 50%, 35%)',
      'movement': 'hsl(120, 50%, 30%)',
      'composition': 'hsl(120, 50%, 25%)',
      'root': 'hsl(120, 50%, 22%)'
    };
    return colorMap[type] || 'hsl(210, 60%, 50%)';
  }
}
