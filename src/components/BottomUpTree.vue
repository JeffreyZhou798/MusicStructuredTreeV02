<template>
  <div class="bottom-up-tree" role="tree" aria-label="Musical Structure Tree (Bottom-Up)">
    <!-- Level labels on the left -->
    <div class="level-labels">
      <div 
        v-for="level in displayLevels" 
        :key="level.key"
        class="level-label"
        :class="{ 'has-nodes': level.hasNodes }"
      >
        <span class="level-name">{{ level.name }}</span>
        <span class="level-description">{{ level.description }}</span>
      </div>
    </div>

    <!-- Tree content -->
    <div class="tree-content">
      <div 
        v-for="level in displayLevels" 
        :key="level.key"
        class="level-row"
        :class="{ 'has-nodes': level.hasNodes }"
      >
        <div class="level-nodes">
          <BottomUpTreeNode
            v-for="node in getNodesAtLevel(level.key)"
            :key="node.id"
            :node="node"
            :selected-node="selectedNode"
            :expanded-nodes="expandedNodes"
            :level-key="level.key"
            @node-click="$emit('node-click', $event)"
            @node-toggle="$emit('node-toggle', $event)"
          />
        </div>
        <div v-if="!level.hasNodes" class="empty-level">
          <span>—</span>
        </div>
      </div>
    </div>

    <!-- Connection lines (SVG overlay) -->
    <svg class="connection-lines" ref="connectionSvg">
      <g v-for="connection in connections" :key="connection.id">
        <path 
          :d="connection.path" 
          fill="none" 
          :stroke="connection.color"
          stroke-width="2"
          :stroke-dasharray="connection.dashed ? '4,4' : 'none'"
        />
      </g>
    </svg>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import BottomUpTreeNode from './BottomUpTreeNode.vue';

export default {
  name: 'BottomUpTree',
  components: { BottomUpTreeNode },
  props: {
    root: {
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
    }
  },
  emits: ['node-click', 'node-toggle'],
  setup(props) {
    const connectionSvg = ref(null);
    const connections = ref([]);

    // Define hierarchy levels from bottom (leaf) to top (root)
    // Following the spec: Root – Piece/Movement – Trunk – Section/Theme – Branch – Phrase – Node – Sub-phrase – Leaf – Motif
    const levelHierarchy = [
      { key: 'motif', name: 'Motif', description: '动机 (最小单元)' },
      { key: 'subphrase', name: 'Sub-phrase (Leaf)', description: '乐汇/半乐句' },
      { key: 'phrase', name: 'Phrase (Node)', description: '乐句' },
      { key: 'period', name: 'Period (Branch)', description: '乐段' },
      { key: 'theme', name: 'Section/Theme', description: '主题/段落' },
      { key: 'section', name: 'Trunk', description: '呈示部/展开部/再现部' },
      { key: 'movement', name: 'Piece/Movement', description: '乐章' },
      { key: 'root', name: 'Root', description: '作品整体' }
    ];

    // Map internal types to display levels
    const typeToLevel = {
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

    // Collect all nodes by level
    const nodesByLevel = computed(() => {
      const levels = {};
      levelHierarchy.forEach(l => levels[l.key] = []);
      
      const collectNodes = (node, depth = 0) => {
        const levelKey = typeToLevel[node.type] || typeToLevel[node.level] || 'phrase';
        if (levels[levelKey]) {
          levels[levelKey].push({ ...node, depth });
        }
        
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => collectNodes(child, depth + 1));
        }
      };
      
      if (props.root) {
        collectNodes(props.root);
      }
      
      return levels;
    });

    // Display levels with hasNodes flag
    const displayLevels = computed(() => {
      return levelHierarchy.map(level => ({
        ...level,
        hasNodes: nodesByLevel.value[level.key]?.length > 0
      }));
    });

    const getNodesAtLevel = (levelKey) => {
      return nodesByLevel.value[levelKey] || [];
    };

    // Update connection lines when tree changes
    const updateConnections = async () => {
      await nextTick();
      // Connection line calculation would go here
      // For now, we'll use CSS-based connections
      connections.value = [];
    };

    watch(() => props.root, updateConnections, { deep: true });
    watch(() => props.expandedNodes, updateConnections, { deep: true });

    onMounted(() => {
      updateConnections();
    });

    return {
      connectionSvg,
      connections,
      displayLevels,
      getNodesAtLevel
    };
  }
};
</script>

<style scoped>
.bottom-up-tree {
  display: flex;
  flex-direction: column-reverse;
  position: relative;
  min-height: 100%;
  padding: 1rem;
}

.level-labels {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 140px;
  display: flex;
  flex-direction: column-reverse;
  border-right: 1px solid var(--border-color);
  background: var(--bg-color);
  z-index: 5;
}

.level-label {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.level-label.has-nodes {
  opacity: 1;
  background: rgba(74, 144, 226, 0.05);
}

.level-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--primary-dark);
}

.level-description {
  font-size: 0.7rem;
  color: var(--text-light);
  margin-top: 0.25rem;
}

.tree-content {
  display: flex;
  flex-direction: column-reverse;
  margin-left: 150px;
  flex: 1;
}

.level-row {
  min-height: 60px;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.level-row.has-nodes {
  background: rgba(74, 144, 226, 0.02);
}

.level-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.empty-level {
  color: var(--text-light);
  font-style: italic;
  font-size: 0.85rem;
}

.connection-lines {
  position: absolute;
  top: 0;
  left: 150px;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}
</style>
