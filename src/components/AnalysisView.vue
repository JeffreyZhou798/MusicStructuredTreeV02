<template>
  <div class="analysis-view">
    <div class="analysis-header">
      <h2>Structure Analysis</h2>
      <div class="header-actions">
        <button 
          class="btn btn-secondary"
          :class="{ active: editMode }"
          @click="toggleEditMode"
        >
          {{ editMode ? 'Exit Edit Mode' : 'Edit Mode' }}
        </button>
        <button class="btn btn-secondary" @click="exportJSON">
          Export JSON
        </button>
        <button class="btn btn-secondary" @click="exportHTML">
          Export HTML
        </button>
      </div>
    </div>

    <div class="analysis-content">
      <!-- Structure Tree Panel -->
      <div class="tree-panel card">
        <div class="panel-header">
          <h3>Structure Tree</h3>
          <PatternLegend />
        </div>
        <StructureTree 
          v-if="structureTree"
          :root="structureTree"
          :selected-node="selectedNode"
          :expanded-nodes="expandedNodes"
          @node-click="handleNodeClick"
          @node-toggle="handleNodeToggle"
        />
        <div v-else class="no-data">
          No analysis data available. Please upload and analyze a music file.
        </div>
      </div>

      <!-- Score and Audio Panel -->
      <div class="detail-panel">
        <div class="score-panel card">
          <h3>Score View</h3>
          <ScoreRenderer 
            v-if="parsedScore"
            :score="parsedScore"
            :highlight-measures="highlightMeasures"
          />
          <div v-else class="no-data">
            Upload a MusicXML file to view the score.
          </div>
        </div>

        <div class="audio-panel card">
          <h3>Audio Playback</h3>
          <AudioPlayer 
            v-if="audioBuffer"
            :buffer="audioBuffer"
            :start-time="playbackStart"
            :end-time="playbackEnd"
          />
          <div v-else class="no-data">
            Upload an MP3 file to enable audio playback.
          </div>
        </div>

        <!-- Node Details -->
        <div v-if="selectedNodeData" class="node-details card">
          <h3>Node Details</h3>
          <NodeDetails :node="selectedNodeData" />
        </div>
      </div>
    </div>

    <!-- Edit Panel (shown when edit mode is active) -->
    <EditPanel 
      v-if="editMode"
      :selected-node="selectedNodeData"
      @split="handleSplit"
      @merge="handleMerge"
      @relabel="handleRelabel"
    />
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/appStore';
import StructureTree from './StructureTree.vue';
import ScoreRenderer from './ScoreRenderer.vue';
import AudioPlayer from './AudioPlayer.vue';
import NodeDetails from './NodeDetails.vue';
import EditPanel from './EditPanel.vue';
import PatternLegend from './PatternLegend.vue';
import { ProjectExporter } from '../services/ProjectExporter';

export default {
  name: 'AnalysisView',
  components: {
    StructureTree,
    ScoreRenderer,
    AudioPlayer,
    NodeDetails,
    EditPanel,
    PatternLegend
  },
  setup() {
    const store = useAppStore();

    const structureTree = computed(() => store.structureTree);
    const parsedScore = computed(() => store.parsedScore);
    const audioBuffer = computed(() => store.audioBuffer);
    const selectedNode = computed(() => store.selectedNode);
    const expandedNodes = computed(() => store.expandedNodes);
    const editMode = computed(() => store.editMode);

    const selectedNodeData = computed(() => {
      if (!selectedNode.value || !structureTree.value) return null;
      return store.getNodeById(selectedNode.value);
    });

    const highlightMeasures = computed(() => {
      if (!selectedNodeData.value) return [];
      const node = selectedNodeData.value;
      const measures = [];
      for (let i = node.startBar; i <= node.endBar; i++) {
        measures.push(i);
      }
      return measures;
    });

    const playbackStart = computed(() => {
      return selectedNodeData.value?.startTime || 0;
    });

    const playbackEnd = computed(() => {
      return selectedNodeData.value?.endTime || 0;
    });

    const handleNodeClick = (nodeId) => {
      store.selectNode(nodeId);
    };

    const handleNodeToggle = (nodeId) => {
      store.toggleNodeExpansion(nodeId);
    };

    const toggleEditMode = () => {
      store.setEditMode(!editMode.value);
    };

    const handleSplit = (nodeId, splitPoint) => {
      // Implementation for splitting a node
      store.addMessage({
        type: 'info',
        title: 'Split Node',
        message: 'Node splitting will be implemented.',
        persistent: true
      });
    };

    const handleMerge = (nodeIds) => {
      // Implementation for merging nodes
      store.addMessage({
        type: 'info',
        title: 'Merge Nodes',
        message: 'Node merging will be implemented.',
        persistent: true
      });
    };

    const handleRelabel = (nodeId, newLabel) => {
      // Implementation for relabeling a node
      store.addMessage({
        type: 'info',
        title: 'Relabel Node',
        message: 'Node relabeling will be implemented.',
        persistent: true
      });
    };

    const exportJSON = async () => {
      try {
        const exporter = new ProjectExporter(store);
        await exporter.exportJSON();
        store.addMessage({
          type: 'success',
          title: 'Export Successful',
          message: 'Project exported as JSON file.',
          persistent: true
        });
      } catch (error) {
        store.addMessage({
          type: 'error',
          title: 'Export Failed',
          message: error.message,
          persistent: true
        });
      }
    };

    const exportHTML = async () => {
      try {
        const exporter = new ProjectExporter(store);
        await exporter.exportHTML();
        store.addMessage({
          type: 'success',
          title: 'Export Successful',
          message: 'Project exported as interactive HTML file.',
          persistent: true
        });
      } catch (error) {
        store.addMessage({
          type: 'error',
          title: 'Export Failed',
          message: error.message,
          persistent: true
        });
      }
    };

    return {
      structureTree,
      parsedScore,
      audioBuffer,
      selectedNode,
      expandedNodes,
      editMode,
      selectedNodeData,
      highlightMeasures,
      playbackStart,
      playbackEnd,
      handleNodeClick,
      handleNodeToggle,
      toggleEditMode,
      handleSplit,
      handleMerge,
      handleRelabel,
      exportJSON,
      exportHTML
    };
  }
};
</script>

<style scoped>
.analysis-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.analysis-header h2 {
  color: var(--primary-dark);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.analysis-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .analysis-content {
    grid-template-columns: 1fr;
  }
}

.tree-panel {
  min-height: 400px;
  max-height: 600px;
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.panel-header h3 {
  color: var(--primary-dark);
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.score-panel {
  min-height: 200px;
  max-height: 300px;
  overflow: auto;
}

.audio-panel {
  padding: 1rem;
}

.node-details {
  flex: 1;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--text-light);
  font-style: italic;
}

h3 {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--text-color);
}
</style>
