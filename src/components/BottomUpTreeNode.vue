<template>
  <div 
    class="bottom-up-node"
    :class="{ 
      'is-selected': isSelected,
      'is-expanded': isExpanded,
      'has-children': hasChildren
    }"
    role="treeitem"
    :aria-selected="isSelected"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- Node Visual -->
    <div 
      class="node-visual"
      :style="{ backgroundColor: node.color || getDefaultColor() }"
    >
      <span class="node-icon">{{ getNodeIcon() }}</span>
    </div>

    <!-- Node Info -->
    <div class="node-info">
      <span class="node-type">{{ formatType() }}</span>
      <span class="node-measures">m.{{ node.startBar }}-{{ node.endBar }}</span>
    </div>

    <!-- Confidence Badge -->
    <div 
      class="confidence-badge"
      :class="confidenceClass"
      :title="`Confidence: ${Math.round((node.confidence || 0.5) * 100)}%`"
    >
      {{ Math.round((node.confidence || 0.5) * 100) }}%
    </div>

    <!-- Relation Type -->
    <span v-if="node.relationType" class="relation-tag">
      {{ node.relationType }}
    </span>

    <!-- Expand indicator for nodes with children -->
    <button 
      v-if="hasChildren"
      class="expand-btn"
      @click.stop="handleToggle"
      :aria-label="isExpanded ? 'Collapse' : 'Expand'"
    >
      <span :class="['expand-icon', { expanded: isExpanded }]">▼</span>
    </button>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'BottomUpTreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    selectedNode: {
      type: String,
      default: null
    },
    expandedNodes: {
      type: Set,
      default: () => new Set()
    },
    levelKey: {
      type: String,
      default: ''
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
      const conf = props.node.confidence || 0.5;
      if (conf >= 0.8) return 'high';
      if (conf >= 0.6) return 'medium';
      if (conf >= 0.4) return 'low';
      return 'very-low';
    });

    const handleClick = () => {
      emit('node-click', props.node.id);
    };

    const handleToggle = () => {
      emit('node-toggle', props.node.id);
    };

    // Format type according to the hierarchy spec
    const formatType = () => {
      const type = props.node.type || props.node.level;
      const typeMap = {
        'motive': 'Motif',
        'motif': 'Motif',
        'leaf': 'Sub-phrase (Leaf)',
        'subphrase': 'Sub-phrase (Leaf)',
        'phrase': 'Phrase (Node)',
        'period': 'Period (Branch)',
        'branch': 'Period (Branch)',
        'theme': 'Section/Theme',
        'section': 'Trunk',
        'movement': 'Piece/Movement',
        'composition': 'Root',
        'root': 'Root'
      };
      return typeMap[type] || type;
    };

    const getNodeIcon = () => {
      const type = props.node.type || props.node.level;
      const iconMap = {
        'motive': '♪',
        'motif': '♪',
        'leaf': '🌿',
        'subphrase': '🌿',
        'phrase': '📝',
        'period': '🌳',
        'branch': '🌳',
        'theme': '🎭',
        'section': '📦',
        'movement': '🎼',
        'composition': '🎵',
        'root': '🎵'
      };
      return iconMap[type] || '•';
    };

    const getNodeColor = () => {
      // First check if node has a color assigned from ColorMapper
      if (props.node.color) {
        return props.node.color;
      }
      
      // Fallback to level-based colors
      const type = props.node.type || props.node.level;
      const colorMap = {
        'motive': 'hsl(120, 50%, 70%)',
        'motif': 'hsl(120, 50%, 70%)',
        'leaf': 'hsl(120, 50%, 60%)',
        'subphrase': 'hsl(120, 50%, 60%)',
        'phrase': 'hsl(120, 50%, 50%)',
        'period': 'hsl(120, 50%, 40%)',
        'branch': 'hsl(120, 50%, 40%)',
        'theme': 'hsl(120, 50%, 35%)',
        'section': 'hsl(120, 50%, 30%)',
        'movement': 'hsl(120, 50%, 28%)',
        'composition': 'hsl(120, 50%, 25%)',
        'root': 'hsl(120, 50%, 22%)'
      };
      return colorMap[type] || 'hsl(210, 60%, 50%)';
    };

    const getDefaultColor = () => {
      return getNodeColor();
    };

    return {
      hasChildren,
      isExpanded,
      isSelected,
      confidenceClass,
      handleClick,
      handleToggle,
      formatType,
      getNodeIcon,
      getDefaultColor
    };
  }
};
</script>

<style scoped>
.bottom-up-node {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.bottom-up-node:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.15);
}

.bottom-up-node:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

.bottom-up-node.is-selected {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.1);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

.node-visual {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-icon {
  font-size: 0.9rem;
}

.node-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.node-type {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-measures {
  font-size: 0.7rem;
  color: var(--text-light);
}

.confidence-badge {
  font-size: 0.65rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.confidence-badge.high {
  background: rgba(40, 167, 69, 0.15);
  color: var(--success-color);
}

.confidence-badge.medium {
  background: rgba(255, 193, 7, 0.15);
  color: #b38600;
}

.confidence-badge.low {
  background: rgba(220, 53, 69, 0.15);
  color: var(--error-color);
}

.confidence-badge.very-low {
  background: var(--bg-color);
  color: var(--text-light);
}

.relation-tag {
  font-size: 0.65rem;
  padding: 0.125rem 0.375rem;
  background: rgba(74, 144, 226, 0.1);
  color: var(--primary-color);
  border-radius: 10px;
  font-style: italic;
}

.expand-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--bg-color);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.expand-btn:hover {
  background: var(--primary-light);
}

.expand-icon {
  font-size: 0.6rem;
  color: var(--text-light);
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}
</style>
