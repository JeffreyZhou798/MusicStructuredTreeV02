<template>
  <div class="edit-panel card">
    <h3>Edit Mode</h3>
    
    <div v-if="selectedNode" class="edit-controls">
      <div class="edit-section">
        <h4>Selected: {{ formatType(selectedNode.type) }}</h4>
        <p class="edit-info">Measures {{ selectedNode.startBar }} - {{ selectedNode.endBar }}</p>
      </div>

      <!-- Split Node -->
      <div class="edit-section">
        <label>Split at measure:</label>
        <div class="split-controls">
          <input 
            type="number" 
            v-model.number="splitMeasure"
            :min="selectedNode.startBar + 1"
            :max="selectedNode.endBar - 1"
          />
          <button 
            class="btn btn-secondary"
            :disabled="!canSplit"
            @click="handleSplit"
          >
            Split
          </button>
        </div>
      </div>

      <!-- Change Type -->
      <div class="edit-section">
        <label>Change type:</label>
        <select v-model="newType" @change="handleTypeChange">
          <option value="">-- Select --</option>
          <option value="motive">Motive</option>
          <option value="subphrase">Sub-phrase</option>
          <option value="phrase">Phrase</option>
          <option value="period">Period</option>
          <option value="theme">Theme</option>
        </select>
      </div>

      <!-- Change Relationship -->
      <div class="edit-section">
        <label>Change relationship:</label>
        <select v-model="newRelation" @change="handleRelationChange">
          <option value="">-- Select --</option>
          <option value="repetition">Repetition</option>
          <option value="sequence">Sequence</option>
          <option value="variation">Variation</option>
          <option value="contrast">Contrast</option>
          <option value="recurrence">Recurrence</option>
        </select>
      </div>

      <!-- Merge with Sibling -->
      <div v-if="hasSiblings" class="edit-section">
        <label>Merge with:</label>
        <select v-model="mergeTarget">
          <option value="">-- Select sibling --</option>
          <option 
            v-for="sibling in siblings" 
            :key="sibling.id"
            :value="sibling.id"
          >
            {{ formatType(sibling.type) }} (m. {{ sibling.startBar }}-{{ sibling.endBar }})
          </option>
        </select>
        <button 
          class="btn btn-secondary"
          :disabled="!mergeTarget"
          @click="handleMerge"
        >
          Merge
        </button>
      </div>
    </div>

    <div v-else class="no-selection">
      Select a node in the tree to edit.
    </div>

    <!-- Rule Configuration -->
    <div class="rule-config">
      <h4>Rule Weights</h4>
      <div class="weight-slider">
        <label>Temporal: {{ (weights.temporal * 100).toFixed(0) }}%</label>
        <input 
          type="range" 
          v-model.number="weights.temporal" 
          min="0" max="1" step="0.05"
          @change="updateWeights"
        />
      </div>
      <div class="weight-slider">
        <label>Tonal: {{ (weights.tonal * 100).toFixed(0) }}%</label>
        <input 
          type="range" 
          v-model.number="weights.tonal" 
          min="0" max="1" step="0.05"
          @change="updateWeights"
        />
      </div>
      <div class="weight-slider">
        <label>Development: {{ (weights.development * 100).toFixed(0) }}%</label>
        <input 
          type="range" 
          v-model.number="weights.development" 
          min="0" max="1" step="0.05"
          @change="updateWeights"
        />
      </div>
      <div class="weight-slider">
        <label>Level: {{ (weights.level * 100).toFixed(0) }}%</label>
        <input 
          type="range" 
          v-model.number="weights.level" 
          min="0" max="1" step="0.05"
          @change="updateWeights"
        />
      </div>
      
      <div class="threshold-control">
        <label>Merge Threshold: {{ (thresholds.merge * 100).toFixed(0) }}%</label>
        <input 
          type="range" 
          v-model.number="thresholds.merge" 
          min="0.3" max="0.9" step="0.05"
          @change="updateThresholds"
        />
      </div>

      <button class="btn btn-primary" @click="reanalyze">
        Re-analyze with New Settings
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useAppStore } from '../stores/appStore';

export default {
  name: 'EditPanel',
  props: {
    selectedNode: {
      type: Object,
      default: null
    }
  },
  emits: ['split', 'merge', 'relabel'],
  setup(props, { emit }) {
    const store = useAppStore();
    
    const splitMeasure = ref(0);
    const newType = ref('');
    const newRelation = ref('');
    const mergeTarget = ref('');
    
    const weights = ref({ ...store.ruleConfig.weights });
    const thresholds = ref({ ...store.ruleConfig.thresholds });

    const canSplit = computed(() => {
      if (!props.selectedNode) return false;
      const node = props.selectedNode;
      return splitMeasure.value > node.startBar && splitMeasure.value < node.endBar;
    });

    const siblings = computed(() => {
      // In a real implementation, this would find sibling nodes
      return [];
    });

    const hasSiblings = computed(() => siblings.value.length > 0);

    watch(() => props.selectedNode, (node) => {
      if (node) {
        splitMeasure.value = Math.floor((node.startBar + node.endBar) / 2);
        newType.value = '';
        newRelation.value = '';
        mergeTarget.value = '';
      }
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

    const handleSplit = () => {
      if (props.selectedNode && canSplit.value) {
        emit('split', props.selectedNode.id, splitMeasure.value);
      }
    };

    const handleTypeChange = () => {
      if (props.selectedNode && newType.value) {
        emit('relabel', props.selectedNode.id, { type: newType.value });
      }
    };

    const handleRelationChange = () => {
      if (props.selectedNode && newRelation.value) {
        emit('relabel', props.selectedNode.id, { relationType: newRelation.value });
      }
    };

    const handleMerge = () => {
      if (props.selectedNode && mergeTarget.value) {
        emit('merge', [props.selectedNode.id, mergeTarget.value]);
      }
    };

    const updateWeights = () => {
      store.updateRuleWeights(weights.value);
    };

    const updateThresholds = () => {
      store.updateRuleThresholds(thresholds.value);
    };

    const reanalyze = () => {
      store.addMessage({
        type: 'info',
        title: 'Re-analysis',
        message: 'Re-analysis with new settings will be implemented.',
        persistent: true
      });
    };

    return {
      splitMeasure,
      newType,
      newRelation,
      mergeTarget,
      weights,
      thresholds,
      canSplit,
      siblings,
      hasSiblings,
      formatType,
      handleSplit,
      handleTypeChange,
      handleRelationChange,
      handleMerge,
      updateWeights,
      updateThresholds,
      reanalyze
    };
  }
};
</script>

<style scoped>
.edit-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 100;
}

.edit-panel h3 {
  margin-bottom: 1rem;
  color: var(--primary-dark);
}

.edit-controls {
  margin-bottom: 1.5rem;
}

.edit-section {
  margin-bottom: 1rem;
}

.edit-section h4 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.edit-info {
  font-size: 0.8rem;
  color: var(--text-light);
}

.edit-section label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.split-controls {
  display: flex;
  gap: 0.5rem;
}

.split-controls input {
  width: 80px;
}

.no-selection {
  color: var(--text-light);
  font-style: italic;
  padding: 1rem 0;
}

.rule-config {
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}

.rule-config h4 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.weight-slider,
.threshold-control {
  margin-bottom: 0.75rem;
}

.weight-slider label,
.threshold-control label {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.weight-slider input,
.threshold-control input {
  width: 100%;
}

.rule-config .btn {
  width: 100%;
  margin-top: 1rem;
}
</style>
