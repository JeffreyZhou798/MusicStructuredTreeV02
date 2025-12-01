/**
 * Music Theory Rule Engine - Based on 曲式学 (Theory of Musical Form)
 * 
 * This engine implements music theory rules for structural analysis based on:
 * - 乐段 (Period/Paragraph) structure analysis
 * - 终止式 (Cadence) detection
 * - 乐句 (Phrase) and 乐节 (Sub-phrase) identification
 * - 曲式结构原则 (Structural principles): 并列、再现、循环、对称、变奏、奏鸣
 */
export class RuleEngine {
  constructor(config = {}) {
    this.config = {
      weights: {
        cadence: 0.30,        // 终止式权重
        phrase: 0.25,         // 乐句结构权重
        tonal: 0.20,          // 调性一致性权重
        development: 0.15,    // 发展手法权重
        proportion: 0.10,     // 结构比例权重
        ...config.weights
      },
      thresholds: {
        merge: 0.55,
        maxGapBars: 2,
        ...config.thresholds
      },
      enabled: {
        cadenceDetection: true,
        phraseStructure: true,
        tonalAnalysis: true,
        developmentRelation: true,
        proportionCheck: true,
        ...config.enabled
      }
    };

    this.rules = {
      cadenceDetection: new CadenceDetectionRule(this.config),
      phraseStructure: new PhraseStructureRule(this.config),
      tonalAnalysis: new TonalAnalysisRule(this.config),
      developmentRelation: new DevelopmentRelationRule(this.config),
      proportionCheck: new ProportionCheckRule(this.config)
    };
  }

  validate(proposal) {
    const { nodeA, nodeB } = proposal;
    const evaluations = [];
    let compositeScore = 0;
    let totalWeight = 0;

    const ruleOrder = [
      'cadenceDetection',
      'phraseStructure',
      'tonalAnalysis',
      'developmentRelation',
      'proportionCheck'
    ];

    for (const ruleName of ruleOrder) {
      if (!this.config.enabled[ruleName]) continue;

      const rule = this.rules[ruleName];
      const result = rule.evaluate(nodeA, nodeB, proposal);
      evaluations.push(result);

      // 终止式是划分乐句、乐段的重要依据
      if (result.decision === 'reject' && ruleName === 'cadenceDetection') {
        // Check if this is a critical rejection
        if (result.evidence?.isCritical) {
          return {
            decision: 'reject',
            score: 0,
            reason: result.reason,
            evidence: evaluations,
            appliedRules: [ruleName]
          };
        }
      }

      const weight = this.config.weights[this.getWeightKey(ruleName)];
      compositeScore += result.score * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      compositeScore /= totalWeight;
    }

    let decision = 'reject';
    let reason = 'Composite score below threshold';

    if (compositeScore >= this.config.thresholds.merge) {
      decision = 'accept';
      reason = 'Structure analysis passed';
    } else if (compositeScore >= this.config.thresholds.merge * 0.85) {
      decision = 'downgrade';
      reason = 'Near threshold - manual review suggested';
    }

    const devResult = evaluations.find(e => e.ruleName === 'DevelopmentRelation');
    const relationType = devResult?.evidence?.relationType || 'unknown';

    return {
      decision,
      score: compositeScore,
      reason,
      evidence: evaluations,
      appliedRules: ruleOrder.filter(r => this.config.enabled[r]),
      relationType
    };
  }

  validateAll(proposals) {
    return proposals.map(proposal => ({
      ...proposal,
      validation: this.validate(proposal)
    }));
  }

  getWeightKey(ruleName) {
    const keyMap = {
      cadenceDetection: 'cadence',
      phraseStructure: 'phrase',
      tonalAnalysis: 'tonal',
      developmentRelation: 'development',
      proportionCheck: 'proportion'
    };
    return keyMap[ruleName] || 'phrase';
  }

  updateConfig(config) {
    if (config.weights) {
      this.config.weights = { ...this.config.weights, ...config.weights };
    }
    if (config.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...config.thresholds };
    }
    if (config.enabled) {
      this.config.enabled = { ...this.config.enabled, ...config.enabled };
    }
  }

  /**
   * Predict hierarchical level based on music theory
   * 典型长度: 乐段8-16小节; 乐句4-8小节; 乐节2-4小节; 乐汇1-2小节
   */
  predictLevel(segment) {
    return this.rules.phraseStructure.predictLevel(segment);
  }
}


/**
 * Cadence Detection Rule - 终止式检测
 * 终止式是划分乐句、乐段的重要依据
 * 
 * Types:
 * - 全终止 (Perfect Cadence): V-I, 完满全终止要求旋律和低音都落在主音上
 * - 半终止 (Half Cadence): 停在D或D7上
 * - 阻碍终止 (Deceptive Cadence): D7-TSVI
 * - 变格终止 (Plagal Cadence): IV-I
 */
class CadenceDetectionRule {
  constructor(config) {
    this.config = config;
    
    // Cadence patterns based on music theory
    this.cadencePatterns = {
      perfect: {
        patterns: [['V', 'I'], ['V7', 'I'], ['D', 'T']],
        weight: 1.0,
        closureStrength: 'strong'
      },
      imperfect: {
        patterns: [['V', 'I6'], ['V', 'i']],
        weight: 0.85,
        closureStrength: 'moderate'
      },
      half: {
        patterns: [['I', 'V'], ['IV', 'V'], ['ii', 'V'], ['T', 'D']],
        weight: 0.6,
        closureStrength: 'weak'
      },
      deceptive: {
        patterns: [['V', 'vi'], ['V', 'VI'], ['V7', 'vi']],
        weight: 0.7,
        closureStrength: 'moderate'
      },
      plagal: {
        patterns: [['IV', 'I'], ['iv', 'I'], ['S', 'T']],
        weight: 0.8,
        closureStrength: 'moderate'
      }
    };
  }

  evaluate(nodeA, nodeB, proposal) {
    const endNode = nodeA.endBar > nodeB.endBar ? nodeA : nodeB;
    const cadenceResult = this.detectCadence(endNode);
    const rhythmicClosure = this.detectRhythmicClosure(endNode);
    const melodicClosure = this.detectMelodicClosure(endNode);

    let score = 0.3; // Base score
    let decision = 'not_closed';
    let reason = 'No clear cadence detected';

    if (cadenceResult.hasCadence) {
      score = cadenceResult.weight;
      decision = 'closed';
      reason = `Detected ${cadenceResult.type} cadence (${cadenceResult.closureStrength} closure)`;
    } else if (rhythmicClosure.detected && melodicClosure.detected) {
      score = 0.7;
      decision = 'closed';
      reason = 'Rhythmic and melodic closure detected';
    } else if (rhythmicClosure.detected) {
      score = 0.5;
      decision = 'partial_closure';
      reason = 'Rhythmic closure detected (lengthening/rest)';
    } else if (melodicClosure.detected) {
      score = 0.45;
      decision = 'partial_closure';
      reason = 'Melodic closure detected (stepwise descent to tonic)';
    }

    return {
      ruleName: 'CadenceDetection',
      decision,
      score,
      reason,
      evidence: {
        cadenceType: cadenceResult.type,
        closureStrength: cadenceResult.closureStrength,
        rhythmicClosure: rhythmicClosure.detected,
        melodicClosure: melodicClosure.detected,
        isCritical: false
      }
    };
  }

  detectCadence(node) {
    if (!node.features?.chords || node.features.chords.length < 2) {
      return { hasCadence: false };
    }

    const lastChords = node.features.chords.slice(-2);
    const chordRoots = lastChords.map(c => c.root || c);

    for (const [type, data] of Object.entries(this.cadencePatterns)) {
      for (const pattern of data.patterns) {
        if (this.matchesPattern(chordRoots, pattern)) {
          return {
            hasCadence: true,
            type,
            weight: data.weight,
            closureStrength: data.closureStrength,
            chords: chordRoots
          };
        }
      }
    }

    return { hasCadence: false };
  }

  matchesPattern(chords, pattern) {
    if (chords.length < pattern.length) return false;
    const lastN = chords.slice(-pattern.length);
    return lastN.every((chord, i) => 
      this.normalizeChord(chord) === this.normalizeChord(pattern[i])
    );
  }

  normalizeChord(chord) {
    const normalized = chord.toUpperCase().replace(/[0-9]/g, '');
    const equivalents = {
      'V': ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'],
      'I': ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
      'IV': ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
      'VI': ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#'],
      'II': ['D', 'A', 'E', 'B', 'F#', 'C#', 'G#'],
      'T': ['I', 'C', 'G', 'D', 'A', 'E'],
      'D': ['V', 'G', 'D', 'A', 'E', 'B'],
      'S': ['IV', 'F', 'C', 'G', 'D', 'A']
    };
    
    for (const [numeral, roots] of Object.entries(equivalents)) {
      if (normalized === numeral || roots.includes(normalized)) {
        return numeral;
      }
    }
    return normalized;
  }

  detectRhythmicClosure(node) {
    if (!node.features?.notes || node.features.notes.length < 3) {
      return { detected: false };
    }

    const notes = node.features.notes;
    const lastNote = notes[notes.length - 1];
    const avgDuration = notes.reduce((sum, n) => 
      sum + (n.endTime - n.startTime), 0) / notes.length;
    
    const lastDuration = lastNote.endTime - lastNote.startTime;
    
    // Check for lengthening (typical closure pattern)
    if (lastDuration > avgDuration * 1.4) {
      return { detected: true, type: 'lengthening', ratio: lastDuration / avgDuration };
    }

    // Check for rest after last note
    const totalDuration = node.endTime - node.startTime;
    const lastNoteEnd = lastNote.endTime - node.startTime;
    if ((totalDuration - lastNoteEnd) > avgDuration * 0.5) {
      return { detected: true, type: 'rest' };
    }

    return { detected: false };
  }

  detectMelodicClosure(node) {
    if (!node.features?.notes || node.features.notes.length < 3) {
      return { detected: false };
    }

    const notes = node.features.notes;
    const lastPitches = notes.slice(-3).map(n => n.pitch);
    
    // Check for stepwise descent (common closure pattern)
    let isDescending = true;
    for (let i = 1; i < lastPitches.length; i++) {
      const interval = lastPitches[i] - lastPitches[i-1];
      if (interval > 0 || interval < -4) {
        isDescending = false;
        break;
      }
    }

    if (isDescending) {
      return { detected: true, type: 'stepwise_descent' };
    }

    // Check if ending on tonic (pitch class 0 in relative terms)
    const lastPitch = lastPitches[lastPitches.length - 1];
    const pitchClass = lastPitch % 12;
    const tonicPitchClasses = [0, 7]; // C and G as common tonics
    
    if (tonicPitchClasses.includes(pitchClass)) {
      return { detected: true, type: 'tonic_ending' };
    }

    return { detected: false };
  }
}


/**
 * Phrase Structure Rule - 乐句结构规则
 * 
 * Based on music theory:
 * - 乐段 (Period): 8-16 bars, complete musical thought
 * - 乐句 (Phrase): 4-8 bars, has cadence
 * - 乐节 (Sub-phrase): 2-4 bars
 * - 乐汇 (Motif): 1-2 bars
 * 
 * Structure types:
 * - 平行乐段 (Parallel period): a + a' (same head, different ending)
 * - 对比乐段 (Contrasting period): a + b
 * - 模进乐段 (Sequential period): a + a'(transposed)
 */
class PhraseStructureRule {
  constructor(config) {
    this.config = config;
    
    // Typical bar lengths based on music theory
    this.typicalLengths = {
      motif: { min: 1, max: 2, typical: 1.5 },
      subphrase: { min: 2, max: 4, typical: 2 },
      phrase: { min: 4, max: 8, typical: 4 },
      period: { min: 8, max: 16, typical: 8 },
      theme: { min: 16, max: 32, typical: 16 },
      section: { min: 32, max: 64, typical: 32 }
    };
  }

  evaluate(nodeA, nodeB, proposal) {
    const mergedBars = Math.max(nodeA.endBar, nodeB.endBar) - 
                       Math.min(nodeA.startBar, nodeB.startBar) + 1;
    
    // Check if merged structure fits typical phrase lengths
    const structureType = this.determineStructureType(mergedBars);
    const proportionScore = this.evaluateProportion(nodeA, nodeB);
    const structureScore = this.evaluateStructurePattern(nodeA, nodeB);

    let score = 0.5;
    let decision = 'acceptable';
    let reason = 'Structure analysis complete';

    // 方整性乐段: 两句长度相等，小节数以2的倍数递增
    if (this.isSquareStructure(nodeA, nodeB)) {
      score = 0.9;
      decision = 'square_structure';
      reason = '方整性乐段 (Square structure): balanced phrase lengths';
    }
    // 规整性乐段: 两句长度相等但非2的倍数
    else if (this.isRegularStructure(nodeA, nodeB)) {
      score = 0.8;
      decision = 'regular_structure';
      reason = '规整性乐段 (Regular structure): equal phrase lengths';
    }
    // 非方整性乐段: 两句长度不等
    else if (proportionScore > 0.6) {
      score = 0.7;
      decision = 'asymmetric_structure';
      reason = '非方整性乐段 (Asymmetric structure): unequal but proportional';
    }
    else {
      score = proportionScore * 0.8;
      decision = 'irregular';
      reason = 'Irregular structure - may need review';
    }

    // Adjust based on structure pattern
    score = (score + structureScore) / 2;

    return {
      ruleName: 'PhraseStructure',
      decision,
      score,
      reason,
      evidence: {
        mergedBars,
        structureType,
        proportionScore,
        structureScore,
        nodeABars: nodeA.endBar - nodeA.startBar + 1,
        nodeBBars: nodeB.endBar - nodeB.startBar + 1
      }
    };
  }

  determineStructureType(bars) {
    for (const [type, range] of Object.entries(this.typicalLengths)) {
      if (bars >= range.min && bars <= range.max) {
        return type;
      }
    }
    return bars > 64 ? 'movement' : 'motif';
  }

  isSquareStructure(nodeA, nodeB) {
    const barsA = nodeA.endBar - nodeA.startBar + 1;
    const barsB = nodeB.endBar - nodeB.startBar + 1;
    
    // Equal length and power of 2
    if (barsA !== barsB) return false;
    return (barsA & (barsA - 1)) === 0 || barsA % 4 === 0;
  }

  isRegularStructure(nodeA, nodeB) {
    const barsA = nodeA.endBar - nodeA.startBar + 1;
    const barsB = nodeB.endBar - nodeB.startBar + 1;
    return barsA === barsB;
  }

  evaluateProportion(nodeA, nodeB) {
    const barsA = nodeA.endBar - nodeA.startBar + 1;
    const barsB = nodeB.endBar - nodeB.startBar + 1;
    
    const ratio = Math.min(barsA, barsB) / Math.max(barsA, barsB);
    
    // Golden ratio and common proportions
    const idealRatios = [1.0, 0.618, 0.5, 0.75];
    let bestMatch = 0;
    
    for (const ideal of idealRatios) {
      const match = 1 - Math.abs(ratio - ideal);
      bestMatch = Math.max(bestMatch, match);
    }
    
    return bestMatch;
  }

  evaluateStructurePattern(nodeA, nodeB) {
    // Check for parallel, contrasting, or sequential patterns
    const contourA = nodeA.features?.intervalContour || [];
    const contourB = nodeB.features?.intervalContour || [];
    
    if (contourA.length === 0 || contourB.length === 0) {
      return 0.5;
    }

    const similarity = this.computeContourSimilarity(contourA, contourB);
    
    // 平行结构 (Parallel): high similarity at start
    if (similarity > 0.8) {
      return 0.9; // Parallel period
    }
    // 对比结构 (Contrasting): low similarity
    else if (similarity < 0.3) {
      return 0.7; // Contrasting period
    }
    // 模进结构 (Sequential): moderate similarity with transposition
    else {
      return 0.75;
    }
  }

  computeContourSimilarity(contour1, contour2) {
    const len = Math.min(contour1.length, contour2.length, 8);
    if (len === 0) return 0;

    let matches = 0;
    for (let i = 0; i < len; i++) {
      const dir1 = Math.sign(contour1[i] || 0);
      const dir2 = Math.sign(contour2[i] || 0);
      if (dir1 === dir2) matches++;
    }

    return matches / len;
  }

  /**
   * Predict hierarchical level based on music theory
   */
  predictLevel(segment) {
    const features = segment.features || {};
    const noteCount = features.noteCount || 0;
    const durationBars = (segment.endBar - segment.startBar) + 1 || 1;
    const hasCadence = features.hasCadence || false;
    const cadenceType = features.cadenceType;

    let level = 'subphrase';
    let confidence = 0.5;

    // 乐汇 (Motif): 1-2 bars, smallest unit
    if (durationBars <= 2 && noteCount <= 8) {
      level = 'motif';
      confidence = 0.85;
    }
    // 乐节 (Sub-phrase): 2-4 bars, no cadence required
    else if (durationBars <= 4 && !hasCadence) {
      level = 'subphrase';
      confidence = 0.75;
    }
    // 乐句 (Phrase): 4-8 bars, typically has cadence
    else if (durationBars >= 4 && durationBars <= 8) {
      level = 'phrase';
      confidence = hasCadence ? 0.9 : 0.7;
    }
    // 乐段 (Period): 8-16 bars, complete thought with cadence
    else if (durationBars > 8 && durationBars <= 16) {
      level = 'period';
      confidence = hasCadence && cadenceType === 'perfect' ? 0.9 : 0.75;
    }
    // 主题/段落 (Theme/Section): 16-32 bars
    else if (durationBars > 16 && durationBars <= 32) {
      level = 'theme';
      confidence = 0.7;
    }
    // 更大结构
    else if (durationBars > 32) {
      level = 'section';
      confidence = 0.65;
    }

    return {
      level,
      confidence,
      features: { noteCount, durationBars, hasCadence, cadenceType }
    };
  }
}


/**
 * Tonal Analysis Rule - 调性分析规则
 * 
 * Based on music theory:
 * - 主调 (Main key) stability
 * - 转调 (Modulation) detection
 * - 调性布局 (Tonal plan) analysis
 */
class TonalAnalysisRule {
  constructor(config) {
    this.config = config;
    
    // Krumhansl-Schmuckler key profiles
    this.majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    this.minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  }

  evaluate(nodeA, nodeB, proposal) {
    const tonicA = this.estimateTonic(nodeA.features?.pitchClassHistogram);
    const tonicB = this.estimateTonic(nodeB.features?.pitchClassHistogram);

    if (!tonicA || !tonicB) {
      return {
        ruleName: 'TonalAnalysis',
        decision: 'unknown',
        score: 0.5,
        reason: 'Insufficient data for tonal analysis',
        evidence: {}
      };
    }

    const shift = (tonicB.tonic - tonicA.tonic + 12) % 12;
    let score = 0.3;
    let decision = 'different_key';
    let reason = 'Different tonal centers';

    // Same key
    if (shift === 0 && tonicA.mode === tonicB.mode) {
      score = 1.0;
      decision = 'same_key';
      reason = '同调 (Same key): tonal consistency';
    }
    // Parallel major/minor (同主音大小调)
    else if (shift === 0 && tonicA.mode !== tonicB.mode) {
      score = 0.85;
      decision = 'parallel_mode';
      reason = '同主音大小调 (Parallel mode change)';
    }
    // Relative major/minor (关系大小调)
    else if (shift === 3 || shift === 9) {
      score = 0.8;
      decision = 'relative_key';
      reason = '关系大小调 (Relative key)';
    }
    // Dominant key (属调)
    else if (shift === 7) {
      score = 0.75;
      decision = 'dominant_key';
      reason = '属调 (Dominant key)';
    }
    // Subdominant key (下属调)
    else if (shift === 5) {
      score = 0.7;
      decision = 'subdominant_key';
      reason = '下属调 (Subdominant key)';
    }
    // Sequence (模进)
    else if (this.isSequence(nodeA, nodeB, shift)) {
      score = 0.8;
      decision = 'sequence';
      reason = `模进 (Sequence): transposition by ${shift} semitones`;
    }

    return {
      ruleName: 'TonalAnalysis',
      decision,
      score,
      reason,
      evidence: { tonicA, tonicB, shift }
    };
  }

  estimateTonic(pitchClassHistogram) {
    if (!pitchClassHistogram || pitchClassHistogram.length !== 12) {
      return null;
    }

    let bestTonic = 0;
    let bestMode = 'major';
    let bestCorrelation = -Infinity;

    for (let tonic = 0; tonic < 12; tonic++) {
      const rotated = this.rotateHistogram(pitchClassHistogram, tonic);
      
      const majorCorr = this.correlation(rotated, this.majorProfile);
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr;
        bestTonic = tonic;
        bestMode = 'major';
      }

      const minorCorr = this.correlation(rotated, this.minorProfile);
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr;
        bestTonic = tonic;
        bestMode = 'minor';
      }
    }

    return {
      tonic: bestTonic,
      mode: bestMode,
      confidence: Math.max(0, bestCorrelation)
    };
  }

  rotateHistogram(histogram, amount) {
    const rotated = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotated[i] = histogram[(i + amount) % 12];
    }
    return rotated;
  }

  correlation(arr1, arr2) {
    const n = arr1.length;
    const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / n;

    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = arr1[i] - mean1;
      const d2 = arr2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }

    const den = Math.sqrt(den1 * den2);
    return den > 0 ? num / den : 0;
  }

  isSequence(nodeA, nodeB, shift) {
    if (!nodeA.features?.intervalContour || !nodeB.features?.intervalContour) {
      return false;
    }

    const contourA = nodeA.features.intervalContour;
    const contourB = nodeB.features.intervalContour;

    if (contourA.length === 0 || contourB.length === 0) return false;

    // Sequences preserve interval patterns
    const len = Math.min(contourA.length, contourB.length);
    let matches = 0;
    for (let i = 0; i < len; i++) {
      if (contourA[i] === contourB[i]) matches++;
    }

    return matches / len > 0.85;
  }
}


/**
 * Development Relation Rule - 发展手法规则
 * 
 * Based on music theory development techniques:
 * - 重复 (Repetition): exact or near-exact repeat
 * - 再现 (Recapitulation): return of material
 * - 模进 (Sequence): transposed repetition
 * - 变奏 (Variation): modified repetition
 * - 对比 (Contrast): new material
 * - 展开 (Development): fragmentation and elaboration
 */
class DevelopmentRelationRule {
  constructor(config) {
    this.config = config;
  }

  evaluate(nodeA, nodeB, proposal) {
    const contourSim = this.computeContourSimilarity(nodeA, nodeB);
    const intervalSim = this.computeIntervalSimilarity(nodeA, nodeB);
    const rhythmSim = this.computeRhythmSimilarity(nodeA, nodeB);
    const pitchSim = this.computePitchSimilarity(nodeA, nodeB);

    let relationType = 'contrast';
    let score = 0.3;
    let reason = '对比 (Contrast): different material';

    // 重复 (Repetition): very high similarity
    if (contourSim > 0.95 && intervalSim > 0.95 && rhythmSim > 0.9) {
      relationType = 'repetition';
      score = 0.95;
      reason = '重复 (Repetition): near-identical material';
    }
    // 再现 (Recapitulation): high similarity with some variation
    else if (contourSim > 0.85 && intervalSim > 0.8 && rhythmSim > 0.75) {
      relationType = 'recapitulation';
      score = 0.85;
      reason = '再现 (Recapitulation): return of material';
    }
    // 模进 (Sequence): same contour, transposed
    else if (contourSim > 0.85 && this.isTransposed(nodeA, nodeB)) {
      relationType = 'sequence';
      score = 0.8;
      reason = '模进 (Sequence): transposed repetition';
    }
    // 变奏 (Variation): preserved contour with modifications
    else if (contourSim > 0.7 && (rhythmSim < 0.7 || intervalSim < 0.7)) {
      relationType = 'variation';
      score = 0.7;
      reason = '变奏 (Variation): modified repetition';
    }
    // 展开 (Development): partial similarity, fragmentation
    else if (contourSim > 0.5 || this.hasMotivicConnection(nodeA, nodeB)) {
      relationType = 'development';
      score = 0.6;
      reason = '展开 (Development): motivic elaboration';
    }

    return {
      ruleName: 'DevelopmentRelation',
      decision: relationType,
      score,
      reason,
      evidence: {
        relationType,
        contourSimilarity: contourSim,
        intervalSimilarity: intervalSim,
        rhythmSimilarity: rhythmSim,
        pitchSimilarity: pitchSim
      }
    };
  }

  computeContourSimilarity(nodeA, nodeB) {
    const contourA = nodeA.features?.intervalContour || [];
    const contourB = nodeB.features?.intervalContour || [];

    if (contourA.length === 0 || contourB.length === 0) return 0;

    // Normalize to direction only
    const dirA = contourA.map(i => Math.sign(i));
    const dirB = contourB.map(i => Math.sign(i));

    return this.arrayCorrelation(dirA, dirB);
  }

  computeIntervalSimilarity(nodeA, nodeB) {
    const intervalsA = nodeA.features?.intervalContour || [];
    const intervalsB = nodeB.features?.intervalContour || [];

    if (intervalsA.length === 0 || intervalsB.length === 0) return 0;

    return this.arrayCorrelation(intervalsA, intervalsB);
  }

  computeRhythmSimilarity(nodeA, nodeB) {
    const rhythmA = nodeA.features?.rhythmFingerprint || [];
    const rhythmB = nodeB.features?.rhythmFingerprint || [];

    if (rhythmA.length === 0 || rhythmB.length === 0) return 0;

    return this.arrayCorrelation(rhythmA, rhythmB);
  }

  computePitchSimilarity(nodeA, nodeB) {
    const histA = nodeA.features?.pitchClassHistogram || [];
    const histB = nodeB.features?.pitchClassHistogram || [];

    if (histA.length === 0 || histB.length === 0) return 0;

    return this.arrayCorrelation(histA, histB);
  }

  isTransposed(nodeA, nodeB) {
    const intervalsA = nodeA.features?.intervalContour || [];
    const intervalsB = nodeB.features?.intervalContour || [];

    if (intervalsA.length === 0 || intervalsB.length === 0) return false;

    // Check if intervals are identical (transposition preserves intervals)
    const len = Math.min(intervalsA.length, intervalsB.length);
    let matches = 0;

    for (let i = 0; i < len; i++) {
      if (intervalsA[i] === intervalsB[i]) matches++;
    }

    return matches / len > 0.9;
  }

  hasMotivicConnection(nodeA, nodeB) {
    // Check for shared motivic fragments
    const contourA = nodeA.features?.intervalContour || [];
    const contourB = nodeB.features?.intervalContour || [];

    if (contourA.length < 3 || contourB.length < 3) return false;

    // Look for matching 3-note patterns
    const patternsA = this.extractPatterns(contourA, 3);
    const patternsB = this.extractPatterns(contourB, 3);

    for (const patA of patternsA) {
      for (const patB of patternsB) {
        if (this.patternsMatch(patA, patB)) {
          return true;
        }
      }
    }

    return false;
  }

  extractPatterns(contour, length) {
    const patterns = [];
    for (let i = 0; i <= contour.length - length; i++) {
      patterns.push(contour.slice(i, i + length));
    }
    return patterns;
  }

  patternsMatch(pat1, pat2) {
    if (pat1.length !== pat2.length) return false;
    return pat1.every((v, i) => Math.sign(v) === Math.sign(pat2[i]));
  }

  arrayCorrelation(arr1, arr2) {
    const targetLen = Math.max(arr1.length, arr2.length);
    const norm1 = this.interpolate(arr1, targetLen);
    const norm2 = this.interpolate(arr2, targetLen);

    const n = norm1.length;
    if (n === 0) return 0;

    const mean1 = norm1.reduce((a, b) => a + b, 0) / n;
    const mean2 = norm2.reduce((a, b) => a + b, 0) / n;

    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = norm1[i] - mean1;
      const d2 = norm2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }

    const den = Math.sqrt(den1 * den2);
    return den > 0 ? (num / den + 1) / 2 : 0.5;
  }

  interpolate(arr, targetLen) {
    if (arr.length === 0) return new Array(targetLen).fill(0);
    if (arr.length === targetLen) return arr;
    
    const result = new Array(targetLen);
    const ratio = (arr.length - 1) / (targetLen - 1);

    for (let i = 0; i < targetLen; i++) {
      const srcIdx = i * ratio;
      const lower = Math.floor(srcIdx);
      const upper = Math.min(lower + 1, arr.length - 1);
      const frac = srcIdx - lower;
      result[i] = arr[lower] * (1 - frac) + arr[upper] * frac;
    }

    return result;
  }
}


/**
 * Proportion Check Rule - 结构比例规则
 * 
 * Based on music theory structural principles:
 * - 方整性 (Square structure): 4+4, 8+8 bars
 * - 规整性 (Regular structure): equal but non-power-of-2
 * - 黄金分割 (Golden ratio): ~0.618
 */
class ProportionCheckRule {
  constructor(config) {
    this.config = config;
  }

  evaluate(nodeA, nodeB, proposal) {
    const barsA = nodeA.endBar - nodeA.startBar + 1;
    const barsB = nodeB.endBar - nodeB.startBar + 1;
    const totalBars = barsA + barsB;

    // Check temporal adjacency
    const gap = Math.min(
      Math.abs(nodeA.startBar - nodeB.endBar),
      Math.abs(nodeB.startBar - nodeA.endBar)
    );

    if (gap > this.config.thresholds.maxGapBars + 1) {
      // Non-adjacent - check for recurrence
      if (proposal.similarity > 0.8) {
        return {
          ruleName: 'ProportionCheck',
          decision: 'recurrence',
          score: 0.6,
          reason: '再现关系 (Recurrence): similar but distant',
          evidence: { barsA, barsB, gap, isRecurrence: true }
        };
      }
      return {
        ruleName: 'ProportionCheck',
        decision: 'reject',
        score: 0.2,
        reason: 'Segments too far apart',
        evidence: { barsA, barsB, gap }
      };
    }

    let score = 0.5;
    let decision = 'acceptable';
    let reason = 'Structure proportion analysis';

    // 方整性 (Square structure)
    if (barsA === barsB && this.isPowerOfTwo(barsA)) {
      score = 1.0;
      decision = 'square';
      reason = `方整性结构 (Square): ${barsA}+${barsB} bars`;
    }
    // Common square patterns
    else if ((barsA === 4 && barsB === 4) || (barsA === 8 && barsB === 8)) {
      score = 1.0;
      decision = 'square';
      reason = `方整性结构 (Square): ${barsA}+${barsB} bars`;
    }
    // 规整性 (Regular structure)
    else if (barsA === barsB) {
      score = 0.85;
      decision = 'regular';
      reason = `规整性结构 (Regular): ${barsA}+${barsB} bars`;
    }
    // Golden ratio approximation
    else if (this.isGoldenRatio(barsA, barsB)) {
      score = 0.8;
      decision = 'golden';
      reason = '黄金分割 (Golden ratio) proportion';
    }
    // 2:1 or 1:2 ratio (common in extensions)
    else if (Math.max(barsA, barsB) === 2 * Math.min(barsA, barsB)) {
      score = 0.75;
      decision = 'double';
      reason = '扩充结构 (Extended): 2:1 proportion';
    }
    // 3:2 ratio
    else if (this.isRatio(barsA, barsB, 3, 2)) {
      score = 0.7;
      decision = 'extended';
      reason = '扩充结构 (Extended): 3:2 proportion';
    }
    // Acceptable range
    else {
      const ratio = Math.min(barsA, barsB) / Math.max(barsA, barsB);
      score = 0.5 + ratio * 0.3;
      decision = 'asymmetric';
      reason = `非方整性结构 (Asymmetric): ${barsA}+${barsB} bars`;
    }

    return {
      ruleName: 'ProportionCheck',
      decision,
      score,
      reason,
      evidence: { barsA, barsB, totalBars, gap }
    };
  }

  isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
  }

  isGoldenRatio(a, b) {
    const ratio = Math.min(a, b) / Math.max(a, b);
    const golden = 0.618;
    return Math.abs(ratio - golden) < 0.05;
  }

  isRatio(a, b, num, den) {
    const ratio1 = a / b;
    const ratio2 = b / a;
    const target = num / den;
    return Math.abs(ratio1 - target) < 0.1 || Math.abs(ratio2 - target) < 0.1;
  }
}
