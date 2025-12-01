<template>
  <div class="file-upload-container">
    <div class="upload-section card">
      <h2>Upload Music Files</h2>
      <p class="upload-description">
        Upload MusicXML (.mxl, .musicxml) and/or MP3 files to analyze musical structure.
        For best results, upload both symbolic notation and audio.
      </p>

      <div class="upload-zones">
        <!-- MusicXML Upload -->
        <div 
          class="upload-zone"
          :class="{ 'has-file': musicXMLFile, 'drag-over': dragOverXML }"
          @dragover.prevent="dragOverXML = true"
          @dragleave="dragOverXML = false"
          @drop.prevent="handleDrop($event, 'musicxml')"
          @click="$refs.musicxmlInput.click()"
        >
          <input 
            ref="musicxmlInput"
            type="file" 
            accept=".mxl,.musicxml,.xml"
            @change="handleFileSelect($event, 'musicxml')"
            hidden
          />
          <div class="upload-icon">📄</div>
          <div class="upload-label">
            <span v-if="!musicXMLFile">Drop MusicXML file here or click to browse</span>
            <span v-else class="file-name">{{ musicXMLFile.name }}</span>
          </div>
          <div class="upload-formats">.mxl, .musicxml</div>
          <button 
            v-if="musicXMLFile" 
            class="btn-remove"
            @click.stop="removeFile('musicxml')"
          >✕</button>
        </div>

        <!-- MP3 Upload -->
        <div 
          class="upload-zone"
          :class="{ 'has-file': mp3File, 'drag-over': dragOverMP3 }"
          @dragover.prevent="dragOverMP3 = true"
          @dragleave="dragOverMP3 = false"
          @drop.prevent="handleDrop($event, 'mp3')"
          @click="$refs.mp3Input.click()"
        >
          <input 
            ref="mp3Input"
            type="file" 
            accept=".mp3,audio/mpeg"
            @change="handleFileSelect($event, 'mp3')"
            hidden
          />
          <div class="upload-icon">🎵</div>
          <div class="upload-label">
            <span v-if="!mp3File">Drop MP3 file here or click to browse</span>
            <span v-else class="file-name">{{ mp3File.name }}</span>
          </div>
          <div class="upload-formats">.mp3</div>
          <button 
            v-if="mp3File" 
            class="btn-remove"
            @click.stop="removeFile('mp3')"
          >✕</button>
        </div>
      </div>

      <!-- Analysis Options -->
      <div class="analysis-options">
        <label class="checkbox-label">
          <input type="checkbox" v-model="lightweightMode" />
          <span>Lightweight Mode (faster, symbolic analysis only)</span>
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="upload-actions">
        <button 
          class="btn btn-primary"
          :class="{ active: isAnalyzing }"
          :disabled="!canAnalyze || isAnalyzing"
          @click="startAnalysis"
        >
          <span v-if="isAnalyzing" class="spinner-small"></span>
          {{ isAnalyzing ? 'Analyzing...' : 'Analyze Structure' }}
        </button>
        <button 
          class="btn btn-secondary"
          @click="loadProject"
        >
          Load Project (JSON)
        </button>
        <input 
          ref="projectInput"
          type="file" 
          accept=".json"
          @change="handleProjectLoad"
          hidden
        />
      </div>

      <!-- Progress -->
      <div v-if="isAnalyzing" class="progress-section">
        <div class="progress-info">
          <span>{{ processingStage }}</span>
          <span>{{ Math.round(progress) }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Example Compositions -->
    <div class="examples-section card">
      <h3>Try Example Compositions</h3>
      <div class="examples-grid">
        <div 
          v-for="example in examples" 
          :key="example.id"
          class="example-card"
          @click="loadExample(example)"
        >
          <div class="example-icon">{{ example.icon }}</div>
          <div class="example-info">
            <h4>{{ example.title }}</h4>
            <p>{{ example.composer }}</p>
            <span class="example-form">{{ example.form }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/appStore';
import { FileValidator } from '../services/FileValidator';
import { AnalysisPipeline } from '../services/AnalysisPipeline';

export default {
  name: 'FileUpload',
  emits: ['analysis-complete'],
  setup(props, { emit }) {
    const store = useAppStore();
    
    const musicXMLFile = ref(null);
    const mp3File = ref(null);
    const dragOverXML = ref(false);
    const dragOverMP3 = ref(false);
    const lightweightMode = ref(false);
    const isAnalyzing = ref(false);

    const examples = [
      {
        id: 'mozart-k545',
        title: 'Mozart Piano K.545 First Movement',
        composer: 'W.A. Mozart',
        form: 'Sonata Form',
        icon: '🎹'
      },
      {
        id: 'mozart-k311',
        title: 'Mozart Piano Sonata No. 9 First Movement',
        composer: 'W.A. Mozart',
        form: 'Sonata Form',
        icon: '🎹'
      },
      {
        id: 'mozart-violin-k216',
        title: 'Mozart Violin Concerto No. 3 First Movement',
        composer: 'W.A. Mozart',
        form: 'Concerto Form',
        icon: '🎻'
      },
      {
        id: 'haydn-cello',
        title: 'Haydn Cello Concerto in C First Movement',
        composer: 'J. Haydn',
        form: 'Concerto Form',
        icon: '🎻'
      }
    ];

    const canAnalyze = computed(() => musicXMLFile.value || mp3File.value);
    const processingStage = computed(() => store.processingStage);
    const progress = computed(() => store.progress);

    const handleFileSelect = async (event, type) => {
      const file = event.target.files[0];
      if (!file) return;
      await validateAndSetFile(file, type);
    };

    const handleDrop = async (event, type) => {
      dragOverXML.value = false;
      dragOverMP3.value = false;
      const file = event.dataTransfer.files[0];
      if (!file) return;
      await validateAndSetFile(file, type);
    };

    const validateAndSetFile = async (file, type) => {
      try {
        await FileValidator.validate(file, type);
        
        if (type === 'musicxml') {
          musicXMLFile.value = file;
          store.setUploadedFile('musicXML', file);
        } else {
          mp3File.value = file;
          store.setUploadedFile('mp3', file);
        }
        
        store.addMessage({
          type: 'success',
          title: 'File Uploaded',
          message: `${file.name} uploaded successfully.`,
          persistent: true
        });
      } catch (error) {
        store.addMessage({
          type: 'error',
          title: 'Upload Failed',
          message: error.message,
          details: error.details || null,
          persistent: true
        });
      }
    };

    const removeFile = (type) => {
      if (type === 'musicxml') {
        musicXMLFile.value = null;
        store.setUploadedFile('musicXML', null);
      } else {
        mp3File.value = null;
        store.setUploadedFile('mp3', null);
      }
    };

    const startAnalysis = async () => {
      isAnalyzing.value = true;
      store.setLightweightMode(lightweightMode.value);
      
      try {
        const pipeline = new AnalysisPipeline(store);
        await pipeline.analyze({
          musicXML: musicXMLFile.value,
          mp3: mp3File.value,
          lightweight: lightweightMode.value
        });
        
        store.addMessage({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Musical structure has been analyzed successfully.',
          persistent: true
        });
        
        emit('analysis-complete');
      } catch (error) {
        store.addMessage({
          type: 'error',
          title: 'Analysis Failed',
          message: error.message,
          details: error.stack,
          persistent: true
        });
      } finally {
        isAnalyzing.value = false;
        store.setProcessing(false);
      }
    };

    const loadProject = () => {
      document.querySelector('input[accept=".json"]').click();
    };

    const handleProjectLoad = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const projectState = JSON.parse(text);
        
        if (!projectState.version || !projectState.structureTree) {
          throw new Error('Invalid project file format');
        }
        
        store.loadProjectState(projectState);
        
        store.addMessage({
          type: 'success',
          title: 'Project Loaded',
          message: `Project loaded successfully.`,
          persistent: true
        });
        
        emit('analysis-complete');
      } catch (error) {
        store.addMessage({
          type: 'error',
          title: 'Load Failed',
          message: 'Failed to load project: ' + error.message,
          persistent: true
        });
      }
    };

    const loadExample = async (example) => {
      store.addMessage({
        type: 'info',
        title: 'Loading Example',
        message: `Loading ${example.title}...`,
        persistent: false
      });
      
      isAnalyzing.value = true;
      
      try {
        // Import and use ExampleManager
        const { exampleManager } = await import('../services/ExampleManager');
        const { musicXMLFile: mxlFile, mp3File: audioFile, metadata } = 
          await exampleManager.loadExampleFiles(example.id);
        
        // Set the files
        musicXMLFile.value = mxlFile;
        mp3File.value = audioFile;
        store.setUploadedFile('musicXML', mxlFile);
        store.setUploadedFile('mp3', audioFile);
        
        // Run analysis
        const pipeline = new AnalysisPipeline(store);
        await pipeline.analyze({
          musicXML: mxlFile,
          mp3: audioFile,
          lightweight: lightweightMode.value
        });
        
        store.addMessage({
          type: 'success',
          title: 'Example Loaded',
          message: `${example.title} analyzed successfully.`,
          persistent: true
        });
        
        emit('analysis-complete');
      } catch (error) {
        console.error('Error loading example:', error);
        store.addMessage({
          type: 'error',
          title: 'Load Failed',
          message: 'Failed to load example: ' + error.message,
          persistent: true
        });
      } finally {
        isAnalyzing.value = false;
        store.setProcessing(false);
      }
    };

    return {
      musicXMLFile,
      mp3File,
      dragOverXML,
      dragOverMP3,
      lightweightMode,
      isAnalyzing,
      examples,
      canAnalyze,
      processingStage,
      progress,
      handleFileSelect,
      handleDrop,
      removeFile,
      startAnalysis,
      loadProject,
      handleProjectLoad,
      loadExample
    };
  }
};
</script>

<style scoped>
.file-upload-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.upload-section h2 {
  margin-bottom: 0.5rem;
  color: var(--primary-dark);
}

.upload-description {
  color: var(--text-light);
  margin-bottom: 1.5rem;
}

.upload-zones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.upload-zone {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
}

.upload-zone:hover {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.05);
}

.upload-zone.drag-over {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.1);
}

.upload-zone.has-file {
  border-color: var(--success-color);
  border-style: solid;
  background: rgba(40, 167, 69, 0.05);
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.file-name {
  color: var(--success-color);
}

.upload-formats {
  font-size: 0.875rem;
  color: var(--text-light);
}

.btn-remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--error-color);
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
}

.analysis-options {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.upload-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.progress-section {
  margin-top: 1.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-light);
}

/* Examples Section */
.examples-section h3 {
  margin-bottom: 1rem;
  color: var(--primary-dark);
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.example-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: var(--transition);
}

.example-card:hover {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.05);
}

.example-icon {
  font-size: 2rem;
}

.example-info h4 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.example-info p {
  font-size: 0.8rem;
  color: var(--text-light);
  margin-bottom: 0.25rem;
}

.example-form {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
  color: var(--text-light);
}
</style>
