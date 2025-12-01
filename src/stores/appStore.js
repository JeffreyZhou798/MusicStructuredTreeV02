import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    // File data
    uploadedFiles: {
      musicXML: null,
      mp3: null
    },
    
    // Parsed data
    parsedScore: null,
    audioBuffer: null,
    noteSequence: null,
    
    // Analysis results
    structureTree: null,
    embeddings: new Map(),
    colorScheme: null,
    
    // UI state
    selectedNode: null,
    expandedNodes: new Set(),
    editMode: false,
    currentView: 'upload',
    
    // Configuration
    ruleConfig: {
      weights: {
        temporal: 0.30,
        tonal: 0.25,
        development: 0.30,
        level: 0.15
      },
      thresholds: {
        merge: 0.6,
        maxGapBars: 3
      },
      enabled: {
        temporalContinuity: true,
        phraseClosure: true,
        tonalConsistency: true,
        developmentRelation: true,
        levelLegality: true
      }
    },
    
    // Processing state
    isProcessing: false,
    processingStage: '',
    progress: 0,
    
    // Messages
    messages: [],
    
    // Lightweight mode
    lightweightMode: false,
    
    // Models loaded state
    modelsLoaded: {
      musicVAE: false,
      onsetsFrames: false,
      knn: false
    }
  }),
  
  getters: {
    hasFiles: (state) => state.uploadedFiles.musicXML !== null || state.uploadedFiles.mp3 !== null,
    hasAnalysis: (state) => state.structureTree !== null,
    hasBothFiles: (state) => state.uploadedFiles.musicXML !== null && state.uploadedFiles.mp3 !== null,
    
    getNodeById: (state) => (id) => {
      if (!state.structureTree) return null;
      return findNodeById(state.structureTree, id);
    },
    
    visibleMessages: (state) => state.messages.filter(m => !m.dismissed)
  },
  
  actions: {
    // File management
    setUploadedFile(type, file) {
      this.uploadedFiles[type] = file;
    },
    
    clearFiles() {
      this.uploadedFiles = { musicXML: null, mp3: null };
      this.parsedScore = null;
      this.audioBuffer = null;
      this.noteSequence = null;
    },
    
    // Parsed data
    setParsedScore(score) {
      this.parsedScore = score;
    },
    
    setAudioBuffer(buffer) {
      this.audioBuffer = buffer;
    },
    
    setNoteSequence(sequence) {
      this.noteSequence = sequence;
    },
    
    // Analysis results
    setStructureTree(tree) {
      this.structureTree = tree;
    },
    
    setEmbeddings(embeddings) {
      this.embeddings = embeddings;
    },
    
    setColorScheme(scheme) {
      this.colorScheme = scheme;
    },
    
    // UI state
    selectNode(nodeId) {
      this.selectedNode = nodeId;
    },
    
    toggleNodeExpansion(nodeId) {
      if (this.expandedNodes.has(nodeId)) {
        this.expandedNodes.delete(nodeId);
      } else {
        this.expandedNodes.add(nodeId);
      }
    },
    
    setEditMode(enabled) {
      this.editMode = enabled;
    },
    
    // Configuration
    updateRuleConfig(config) {
      this.ruleConfig = { ...this.ruleConfig, ...config };
    },
    
    updateRuleWeights(weights) {
      this.ruleConfig.weights = { ...this.ruleConfig.weights, ...weights };
    },
    
    updateRuleThresholds(thresholds) {
      this.ruleConfig.thresholds = { ...this.ruleConfig.thresholds, ...thresholds };
    },
    
    // Processing state
    setProcessing(isProcessing, stage = '', progress = 0) {
      this.isProcessing = isProcessing;
      this.processingStage = stage;
      this.progress = progress;
    },
    
    updateProgress(progress, stage = null) {
      this.progress = progress;
      if (stage) this.processingStage = stage;
    },
    
    // Messages
    addMessage(message) {
      const id = Date.now() + Math.random();
      this.messages.push({
        id,
        type: message.type || 'info',
        title: message.title || '',
        message: message.message,
        details: message.details || null,
        actions: message.actions || [],
        persistent: message.persistent !== false,
        dismissed: false,
        timestamp: Date.now()
      });
      return id;
    },
    
    dismissMessage(messageId) {
      const msg = this.messages.find(m => m.id === messageId);
      if (msg) msg.dismissed = true;
    },
    
    clearMessages() {
      this.messages = [];
    },
    
    // Lightweight mode
    setLightweightMode(enabled) {
      this.lightweightMode = enabled;
    },
    
    // Model loading state
    setModelLoaded(modelName, loaded) {
      this.modelsLoaded[modelName] = loaded;
    },
    
    // Project state
    getProjectState() {
      return {
        version: '1.0.0',
        timestamp: Date.now(),
        files: {
          musicXML: this.uploadedFiles.musicXML ? {
            name: this.uploadedFiles.musicXML.name,
            hash: null // Will be computed
          } : null,
          mp3: this.uploadedFiles.mp3 ? {
            name: this.uploadedFiles.mp3.name,
            hash: null
          } : null
        },
        structureTree: this.structureTree,
        embeddings: Object.fromEntries(this.embeddings),
        ruleConfig: this.ruleConfig,
        colorScheme: this.colorScheme,
        expandedNodes: Array.from(this.expandedNodes)
      };
    },
    
    loadProjectState(state) {
      if (state.structureTree) this.structureTree = state.structureTree;
      if (state.embeddings) this.embeddings = new Map(Object.entries(state.embeddings));
      if (state.ruleConfig) this.ruleConfig = state.ruleConfig;
      if (state.colorScheme) this.colorScheme = state.colorScheme;
      if (state.expandedNodes) this.expandedNodes = new Set(state.expandedNodes);
    },
    
    // Reset
    reset() {
      this.clearFiles();
      this.structureTree = null;
      this.embeddings = new Map();
      this.colorScheme = null;
      this.selectedNode = null;
      this.expandedNodes = new Set();
      this.editMode = false;
      this.isProcessing = false;
      this.processingStage = '';
      this.progress = 0;
    }
  }
});

// Helper function to find node by ID in tree
function findNodeById(node, id) {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}
