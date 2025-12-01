<template>
  <div id="app-container" class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <span class="title-icon">🎵</span>
          Music Structure Tree
        </h1>
        <nav class="header-nav">
          <button 
            :class="['nav-btn', { active: currentView === 'upload' }]"
            @click="currentView = 'upload'"
          >
            Upload
          </button>
          <button 
            :class="['nav-btn', { active: currentView === 'analysis' }]"
            @click="currentView = 'analysis'"
            :disabled="!hasAnalysis"
          >
            Analysis
          </button>
          <button 
            :class="['nav-btn', { active: currentView === 'settings' }]"
            @click="currentView = 'settings'"
          >
            Settings
          </button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <FileUpload v-if="currentView === 'upload'" @analysis-complete="onAnalysisComplete" />
      <AnalysisView v-else-if="currentView === 'analysis'" />
      <SettingsView v-else-if="currentView === 'settings'" />
    </main>

    <MessageDialog />

    <footer class="app-footer">
      <p>Music Structure Tree - AI-powered musical analysis for education</p>
    </footer>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useAppStore } from './stores/appStore';
import FileUpload from './components/FileUpload.vue';
import AnalysisView from './components/AnalysisView.vue';
import SettingsView from './components/SettingsView.vue';
import MessageDialog from './components/MessageDialog.vue';

export default {
  name: 'App',
  components: {
    FileUpload,
    AnalysisView,
    SettingsView,
    MessageDialog
  },
  setup() {
    const store = useAppStore();
    const currentView = ref('upload');

    const hasAnalysis = computed(() => store.structureTree !== null);

    const onAnalysisComplete = () => {
      currentView.value = 'analysis';
    };

    return {
      currentView,
      hasAnalysis,
      onAnalysisComplete
    };
  }
};
</script>
