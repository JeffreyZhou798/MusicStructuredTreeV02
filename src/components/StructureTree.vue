<template>
  <div class="structure-tree" role="tree" aria-label="Musical Structure Tree">
    <TreeNode 
      v-if="root"
      :node="root"
      :depth="0"
      :selected-node="selectedNode"
      :expanded-nodes="expandedNodes"
      @node-click="$emit('node-click', $event)"
      @node-toggle="$emit('node-toggle', $event)"
    />
  </div>
</template>

<script>
import TreeNode from './TreeNode.vue';

export default {
  name: 'StructureTree',
  components: { TreeNode },
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
  emits: ['node-click', 'node-toggle']
};
</script>

<style scoped>
.structure-tree {
  padding: 0.5rem;
}
</style>
