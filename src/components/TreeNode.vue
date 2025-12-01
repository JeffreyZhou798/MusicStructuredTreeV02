<template>
  <div 
    class="tree-node"
    :class="{ 'is-selected': isSelected }"
    :style="{ marginLeft: depth * 20 + 'px' }"
  >
    <div 
      class="node-content"
      role="treeitem"
      :aria-expanded="hasChildren ? isExpanded : undefined"
      :aria-level="depth + 1"
      :aria-label="nodeAriaLabel"
      tabindex="0"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.space.prevent="handleClick"
      @keydown.right="handleExpand"
      @keydown.left="handleCollapse"
    >
      <!-- Expand/Collapse Toggle -->
      <button 
        v-if="hasChildren"
        class="toggle-btn"
        @click.stop="handleToggle"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
      >
        <span :class="['toggle-icon', { expanded: isExpanded }]">▶</span>
      </button>
      <span v-else class="toggle-placeholder"></span>

      <!-- Node Visual Pattern -->
      <div 
        class="node-pattern"
        :style="patternStyle"
        :title="node.type"
      >
        <svg :width="patternWidth" :height="patternHeight" v-html="patternSVG"></svg>
      </div>

      <!-- Node Label -->
      <div class="node-label">
        <span class="node-type">{{ formatType(node.type) }}</span>
        <span class="node-measures">m. {{ node.startBar }}-{{ node.endBar }}</span>
        <span v-if="node.relationType" class="node-relation">
          ({{ node.relationType }})
        </span>
      </div>

      <!-- Confidence Indicator -->
      <div 
        class="confidence-indicator"
        :class="confidenceClass"
        :title="`Confidence: ${Math.round(node.confidence * 100)}%`"
      >
        {{ Math.round(node.confidence * 100) }}%
      </div>
    </div>

    <!-- Children -->
    <transition name="expand">
      <div v-if="hasChildren && isExpanded" class="node-children">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          :selected-node="selectedNode"
          :expanded-nodes="expandedNodes"
          @node-click="$emit('node-click', $event)"
          @node-toggle="$emit('node-toggle', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import { computed } from 'vue';
import { generateNodePattern } from '../utils/visualPatterns';

export default {
  name: 'TreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      default: 0
    },
    selectedNode: {
      type: String,
      default: null
    },
    expandedNodes: {
      type: Set,
      default: () => new Set()
    }
  },
  emits: ['node-click', 'node-toggle'],
  setup(props, { emit }) {
    const hasChildren = computed(() => 
      props.node.children && props.node.children.length > 0
    );

    const isExpanded = computed(() => 
      props.expandedNodes.has(props.node.id)
    );

    const isSelected = computed(() => 
      props.selectedNode === props.node.id
    );

    const confidenceClass = computed(() => {
      const conf = props.node.confidence;
      if (conf >= 0.8) return 'high';
      if (conf >= 0.6) return 'medium';
      if (conf >= 0.4) return 'low';
      return 'very-low';
    });

    const patternStyle = computed(() => ({
      opacity: props.node.confidence >= 0.6 ? 1 : 0.6
    }));

    const patternWidth = computed(() => {
      const type = props.node.type || props.node.level;
      if (type === 'motive' || type === 'leaf') return 24;
      if (type === 'subphrase' || type === 'phrase') return 48;
      return 60;
    });

    const patternHeight = computed(() => {
      const type = props.node.type || props.node.level;
      if (type === 'period' || type === 'theme' || type === 'section' || type === 'branch' || type === 'root' || type === 'composition') return 36;
      return 24;
    });

    const patternSVG = computed(() => {
      return generateNodePattern(props.node);
    });

    const nodeAriaLabel = computed(() => {
      return `${props.node.type} from measure ${props.node.startBar} to ${props.node.endBar}, confidence ${Math.round(props.node.confidence * 100)}%`;
    });

    const handleClick = () => {
      emit('node-click', props.node.id);
    };

    const handleToggle = () => {
      emit('node-toggle', props.node.id);
    };

    const handleExpand = () => {
      if (hasChildren.value && !isExpanded.value) {
        emit('node-toggle', props.node.id);
      }
    };

    const handleCollapse = () => {
      if (hasChildren.value && isExpanded.value) {
        emit('node-toggle', props.node.id);
      }
    };

    const formatType = (type) => {
      const typeMap = {
        'motive': 'Motive',
        'subphrase': 'Sub-phrase',
        'phrase': 'Phrase',
        'period': 'Period',
        'theme': 'Theme',
        'section': 'Section',
        'root': 'Composition',
        'composition': 'Composition',
        'branch': 'Section',
        'leaf': 'Phrase'
      };
      // Also check node.label if available
      if (props.node.label) return props.node.label;
      return typeMap[type] || type;
    };

    return {
      hasChildren,
      isExpanded,
      isSelected,
      confidenceClass,
      patternStyle,
      patternWidth,
      patternHeight,
      patternSVG,
      nodeAriaLabel,
      handleClick,
      handleToggle,
      handleExpand,
      handleCollapse,
      formatType
    };
  }
};
</script>

<style scoped>
.tree-node {
  margin-bottom: 0.25rem;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
  border: 2px solid transparent;
}

.node-content:hover {
  background: rgba(74, 144, 226, 0.05);
}

.node-content:focus {
  outline: none;
  border-color: var(--primary-color);
}

.is-selected .node-content {
  background: rgba(74, 144, 226, 0.1);
  border-color: var(--primary-color);
}

.toggle-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon {
  font-size: 0.6rem;
  color: var(--text-light);
  transition: transform 0.2s ease;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.toggle-placeholder {
  width: 20px;
}

.node-pattern {
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.node-type {
  font-weight: 600;
  color: var(--text-color);
}

.node-measures {
  font-size: 0.85rem;
  color: var(--text-light);
}

.node-relation {
  font-size: 0.8rem;
  color: var(--primary-color);
  font-style: italic;
}

.confidence-indicator {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.confidence-indicator.high {
  background: rgba(40, 167, 69, 0.1);
  color: var(--success-color);
}

.confidence-indicator.medium {
  background: rgba(255, 193, 7, 0.1);
  color: #b38600;
}

.confidence-indicator.low {
  background: rgba(220, 53, 69, 0.1);
  color: var(--error-color);
}

.confidence-indicator.very-low {
  background: var(--bg-color);
  color: var(--text-light);
}

.node-children {
  border-left: 1px dashed var(--border-color);
  margin-left: 10px;
  padding-left: 10px;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
