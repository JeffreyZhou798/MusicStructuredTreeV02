<template>
  <div class="node-details">
    <div class="detail-row">
      <span class="detail-label">Type:</span>
      <span class="detail-value type-value">{{ formatHierarchyType(node.type || node.level) }}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Hierarchy:</span>
      <span class="detail-value hierarchy-path">{{ getHierarchyPath(node.type || node.level) }}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Measures:</span>
      <span class="detail-value">{{ node.startBar }} - {{ node.endBar }}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Time:</span>
      <span class="detail-value">{{ formatTime(node.startTime) }} - {{ formatTime(node.endTime) }}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Confidence:</span>
      <span class="detail-value" :class="confidenceClass">
        {{ Math.round((node.confidence || 0.5) * 100) }}%
      </span>
    </div>
    <div v-if="node.relationType" class="detail-row">
      <span class="detail-label">Relationship:</span>
      <span class="detail-value relation">{{ formatRelationType(node.relationType) }}</span>
    </div>

    <!-- Hierarchy Visualization -->
    <div class="hierarchy-visual">
      <div class="hierarchy-title">Structure Hierarchy</div>
      <div class="hierarchy-levels">
        <div 
          v-for="(level, index) in hierarchyLevels" 
          :key="level.key"
          class="hierarchy-level"
          :class="{ 
            'is-current': isCurrentLevel(level.key),
            'is-above': isAboveCurrentLevel(level.key),
            'is-below': isBelowCurrentLevel(level.key)
          }"
        >
          <div class="level-indicator">
            <span class="level-dot"></span>
            <span v-if="index < hierarchyLevels.length - 1" class="level-line"></span>
          </div>
          <div class="level-info">
            <span class="level-name">{{ level.name }}</span>
            <span class="level-chinese">{{ level.chinese }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Rule Evidence -->
    <div v-if="node.ruleEvaluations && node.ruleEvaluations.length" class="evidence-section">
      <button class="evidence-toggle" @click="showEvidence = !showEvidence">
        {{ showEvidence ? 'Hide' : 'Show' }} Rule Evidence
      </button>
      <div v-if="showEvidence" class="evidence-list">
        <div 
          v-for="(rule, index) in node.ruleEvaluations" 
          :key="index"
          class="evidence-item"
        >
          <div class="evidence-header">
            <span class="rule-name">{{ rule.ruleName }}</span>
            <span :class="['rule-decision', rule.decision]">{{ rule.decision }}</span>
          </div>
          <div class="evidence-score">Score: {{ (rule.score * 100).toFixed(1) }}%</div>
          <div class="evidence-reason">{{ rule.reason }}</div>
          <div v-if="rule.evidence" class="evidence-details">
            <pre>{{ JSON.stringify(rule.evidence, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div v-if="node.features" class="features-section">
      <button class="features-toggle" @click="showFeatures = !showFeatures">
        {{ showFeatures ? 'Hide' : 'Show' }} Musical Features
      </button>
      <div v-if="showFeatures" class="features-list">
        <div class="feature-item">
          <span>Note Count:</span>
          <span>{{ node.features.noteCount || 0 }}</span>
        </div>
        <div class="feature-item">
          <span>Duration:</span>
          <span>{{ (node.features.duration || 0).toFixed(2) }}s</span>
        </div>
        <div class="feature-item">
          <span>Average Pitch:</span>
          <span>{{ (node.features.averagePitch || 0).toFixed(1) }}</span>
        </div>
        <div class="feature-item">
          <span>Pitch Range:</span>
          <span>{{ node.features.pitchRange || 0 }}</span>
        </div>
        <div v-if="node.features.hasCadence" class="feature-item cadence">
          <span>Cadence:</span>
          <span>{{ formatCadenceType(node.features.cadenceType) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'NodeDetails',
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const showEvidence = ref(false);
    const showFeatures = ref(false);

    // Define hierarchy levels according to spec:
    // Root – Piece/Movement – Trunk – Section/Theme – Branch – Phrase – Node – Sub-phrase – Leaf – Motif
    const hierarchyLevels = [
      { key: 'root', name: 'Root', chinese: '根' },
      { key: 'movement', name: 'Piece/Movement', chinese: '乐章' },
      { key: 'section', name: 'Trunk', chinese: '主干' },
      { key: 'theme', name: 'Section/Theme', chinese: '段落/主题' },
      { key: 'period', name: 'Branch', chinese: '分支/乐段' },
      { key: 'phrase', name: 'Phrase (Node)', chinese: '乐句' },
      { key: 'subphrase', name: 'Sub-phrase (Leaf)', chinese: '乐节/半乐句' },
      { key: 'motif', name: 'Motif', chinese: '动机' }
    ];

    // Map internal types to hierarchy keys
    const typeToHierarchy = {
      'motive': 'motif',
      'motif': 'motif',
      'leaf': 'subphrase',
      'subphrase': 'subphrase',
      'phrase': 'phrase',
      'period': 'period',
      'branch': 'period',
      'theme': 'theme',
      'section': 'section',
      'movement': 'movement',
      'composition': 'root',
      'root': 'root'
    };

    const currentLevelKey = computed(() => {
      const type = props.node.type || props.node.level;
      return typeToHierarchy[type] || 'phrase';
    });

    const currentLevelIndex = computed(() => {
      return hierarchyLevels.findIndex(l => l.key === currentLevelKey.value);
    });

    const confidenceClass = computed(() => {
      const conf = props.node.confidence || 0.5;
      if (conf >= 0.8) return 'high';
      if (conf >= 0.6) return 'medium';
      return 'low';
    });

    // Format type according to hierarchy spec
    const formatHierarchyType = (type) => {
      const typeMap = {
        'motive': 'Motif',
        'motif': 'Motif',
        'leaf': 'Sub-phrase (Leaf)',
        'subphrase': 'Sub-phrase (Leaf)',
        'phrase': 'Phrase (Node)',
        'period': 'Branch (Period)',
        'branch': 'Branch (Period)',
        'theme': 'Section/Theme',
        'section': 'Trunk',
        'movement': 'Piece/Movement',
        'composition': 'Root',
        'root': 'Root'
      };
      return typeMap[type] || type;
    };

    // Get hierarchy path showing containment relationship
    const getHierarchyPath = (type) => {
      const key = typeToHierarchy[type] || 'phrase';
      const index = hierarchyLevels.findIndex(l => l.key === key);
      if (index === -1) return '';
      
      // Show path from root to current level
      const path = hierarchyLevels.slice(0, index + 1).map(l => l.name);
      return path.join(' → ');
    };

    const isCurrentLevel = (levelKey) => {
      return levelKey === currentLevelKey.value;
    };

    const isAboveCurrentLevel = (levelKey) => {
      const levelIndex = hierarchyLevels.findIndex(l => l.key === levelKey);
      return levelIndex < currentLevelIndex.value;
    };

    const isBelowCurrentLevel = (levelKey) => {
      const levelIndex = hierarchyLevels.findIndex(l => l.key === levelKey);
      return levelIndex > currentLevelIndex.value;
    };

    const formatRelationType = (type) => {
      const typeMap = {
        'repetition': 'Repetition (重复)',
        'sequence': 'Sequence (模进)',
        'variation': 'Variation (变奏)',
        'contrast': 'Contrast (对比)',
        'development': 'Development (展开)',
        'recurrence': 'Recurrence (再现)'
      };
      return typeMap[type] || type;
    };

    const formatCadenceType = (type) => {
      const typeMap = {
        'perfect': 'Perfect Cadence (完满终止)',
        'half': 'Half Cadence (半终止)',
        'deceptive': 'Deceptive Cadence (阻碍终止)',
        'plagal': 'Plagal Cadence (变格终止)'
      };
      return typeMap[type] || type || 'Detected';
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
      showEvidence,
      showFeatures,
      hierarchyLevels,
      confidenceClass,
      formatHierarchyType,
      getHierarchyPath,
      isCurrentLevel,
      isAboveCurrentLevel,
      isBelowCurrentLevel,
      formatRelationType,
      formatCadenceType,
      formatTime
    };
  }
};
</script>

<style scoped>
.node-details {
  font-size: 0.9rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-label {
  color: var(--text-light);
}

.detail-value {
  font-weight: 500;
}

.detail-value.type-value {
  color: var(--primary-color);
  font-weight: 600;
}

.detail-value.hierarchy-path {
  font-size: 0.75rem;
  color: var(--text-light);
  text-align: right;
  max-width: 60%;
}

.detail-value.high {
  color: var(--success-color);
}

.detail-value.medium {
  color: #b38600;
}

.detail-value.low {
  color: var(--error-color);
}

.detail-value.relation {
  color: var(--primary-color);
  font-style: italic;
}

/* Hierarchy Visualization */
.hierarchy-visual {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
}

.hierarchy-title {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  color: var(--primary-dark);
}

.hierarchy-levels {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.hierarchy-level {
  display: flex;
  align-items: flex-start;
  padding: 0.25rem 0;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.hierarchy-level.is-current {
  opacity: 1;
}

.hierarchy-level.is-above {
  opacity: 0.7;
}

.hierarchy-level.is-below {
  opacity: 0.3;
}

.level-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  margin-right: 0.5rem;
}

.level-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-color);
  flex-shrink: 0;
}

.hierarchy-level.is-current .level-dot {
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

.hierarchy-level.is-above .level-dot {
  background: var(--primary-light);
}

.level-line {
  width: 2px;
  height: 16px;
  background: var(--border-color);
  margin-top: 2px;
}

.hierarchy-level.is-current .level-line,
.hierarchy-level.is-above .level-line {
  background: var(--primary-light);
}

.level-info {
  display: flex;
  flex-direction: column;
}

.level-name {
  font-size: 0.8rem;
  font-weight: 500;
}

.hierarchy-level.is-current .level-name {
  color: var(--primary-color);
  font-weight: 600;
}

.level-chinese {
  font-size: 0.7rem;
  color: var(--text-light);
}

/* Evidence and Features sections */
.evidence-section,
.features-section {
  margin-top: 1rem;
}

.evidence-toggle,
.features-toggle {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}

.evidence-toggle:hover,
.features-toggle:hover {
  text-decoration: underline;
}

.evidence-list,
.features-list {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
}

.evidence-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.evidence-item:last-child {
  border-bottom: none;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.rule-name {
  font-weight: 500;
}

.rule-decision {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.rule-decision.accept {
  background: rgba(40, 167, 69, 0.1);
  color: var(--success-color);
}

.rule-decision.reject {
  background: rgba(220, 53, 69, 0.1);
  color: var(--error-color);
}

.rule-decision.downgrade {
  background: rgba(255, 193, 7, 0.1);
  color: #b38600;
}

.evidence-score {
  font-size: 0.8rem;
  color: var(--text-light);
}

.evidence-reason {
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.evidence-details {
  margin-top: 0.5rem;
}

.evidence-details pre {
  font-size: 0.7rem;
  background: var(--bg-white);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  max-height: 100px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.feature-item.cadence {
  color: var(--primary-color);
  font-weight: 500;
}
</style>
