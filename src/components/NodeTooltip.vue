<template>
  <div 
    v-if="visible"
    class="node-tooltip"
    :style="tooltipStyle"
  >
    <div class="tooltip-header">
      <span class="tooltip-type">{{ formatType(node.type || node.level) }}</span>
      <span class="tooltip-measures">m. {{ node.startBar }}-{{ node.endBar }}</span>
    </div>
    
    <div class="tooltip-body">
      <div class="tooltip-row">
        <span class="label">Time:</span>
        <span class="value">{{ formatTime(node.startTime) }} - {{ formatTime(node.endTime) }}</span>
      </div>
      
      <div class="tooltip-row">
        <span class="label">Confidence:</span>
        <span class="value" :class="confidenceClass">
          {{ Math.round((node.confidence || 0) * 100) }}%
        </span>
      </div>
      
      <div v-if="node.relationType" class="tooltip-row">
        <span class="label">Relationship:</span>
        <span class="value relation">{{ node.relationType }}</span>
      </div>
      
      <div v-if="node.features" class="tooltip-features">
        <div class="tooltip-row">
          <span class="label">Notes:</span>
          <span class="value">{{ node.features.noteCount || 0 }}</span>
        </div>
        <div v-if="node.features.hasCadence" class="tooltip-row">
          <span class="label">Cadence:</span>
          <span class="value">{{ node.features.cadenceType || 'Yes' }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="showEvidence && node.ruleEvaluations" class="tooltip-evidence">
      <div class="evidence-title">Rule Evidence</div>
      <div 
        v-for="(rule, index) in node.ruleEvaluations.slice(0, 3)" 
        :key="index"
        class="evidence-item"
      >
        <span class="rule-name">{{ rule.ruleName }}</span>
        <span :class="['rule-score', getScoreClass(rule.score)]">
          {{ Math.round(rule.score * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'NodeTooltip',
  props: {
    node: {
      type: Object,
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    showEvidence: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const tooltipStyle = computed(() => ({
      left: props.position.x + 'px',
      top: props.position.y + 'px'
    }));

    const confidenceClass = computed(() => {
      const conf = props.node.confidence || 0;
      if (conf >= 0.8) return 'high';
      if (conf >= 0.6) return 'medium';
      return 'low';
    });

    const formatType = (type) => {
      const typeMap = {
        'motive': 'Motive',
        'subphrase': 'Sub-phrase',
        'phrase': 'Phrase',
        'period': 'Period',
        'theme': 'Theme',
        'section': 'Section',
        'root': 'Composition'
      };
      return typeMap[type] || type;
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getScoreClass = (score) => {
      if (score >= 0.8) return 'high';
      if (score >= 0.6) return 'medium';
      return 'low';
    };

    return {
      tooltipStyle,
      confidenceClass,
      formatType,
      formatTime,
      getScoreClass
    };
  }
};
</script>

<style scoped>
.node-tooltip {
  position: fixed;
  z-index: 1000;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 0.75rem;
  min-width: 200px;
  max-width: 300px;
  font-size: 0.85rem;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
}

.tooltip-type {
  font-weight: 600;
  color: var(--primary-dark);
}

.tooltip-measures {
  color: var(--text-light);
  font-size: 0.8rem;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.label {
  color: var(--text-light);
}

.value {
  font-weight: 500;
}

.value.high { color: var(--success-color); }
.value.medium { color: #b38600; }
.value.low { color: var(--error-color); }
.value.relation { color: var(--primary-color); font-style: italic; }

.tooltip-features {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border-color);
}

.tooltip-evidence {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.evidence-title {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-bottom: 0.25rem;
}

.evidence-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  padding: 0.125rem 0;
}

.rule-name {
  color: var(--text-color);
}

.rule-score {
  font-weight: 500;
}

.rule-score.high { color: var(--success-color); }
.rule-score.medium { color: #b38600; }
.rule-score.low { color: var(--error-color); }
</style>
