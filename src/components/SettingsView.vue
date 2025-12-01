<template>
  <div class="settings-view">
    <div class="settings-section card">
      <h2>Settings</h2>

      <!-- Analysis Mode -->
      <div class="setting-group">
        <h3>Analysis Mode</h3>
        <label class="checkbox-label">
          <input type="checkbox" v-model="lightweightMode" @change="updateLightweightMode" />
          <span>Lightweight Mode</span>
        </label>
        <p class="setting-description">
          Enable for faster analysis on low-memory devices. Uses only symbolic analysis without audio embedding models.
        </p>
      </div>

      <!-- Rule Configuration -->
      <div class="setting-group">
        <h3>Rule Engine Configuration</h3>
        
        <div class="rule-toggles">
          <label class="checkbox-label">
            <input type="checkbox" v-model="rules.temporalContinuity" @change="updateRules" />
            <span>Temporal Continuity Rule</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="rules.phraseClosure" @change="updateRules" />
            <span>Phrase Closure Rule</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="rules.tonalConsistency" @change="updateRules" />
            <span>Tonal Consistency Rule</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="rules.developmentRelation" @change="updateRules" />
            <span>Development Relation Rule</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="rules.levelLegality" @change="updateRules" />
            <span>Level Legality Rule</span>
          </label>
        </div>
      </div>

      <!-- Thresholds -->
      <div class="setting-group">
        <h3>Thresholds</h3>
        
        <div class="threshold-setting">
          <label>Merge Threshold: {{ (thresholds.merge * 100).toFixed(0) }}%</label>
          <input 
            type="range" 
            v-model.number="thresholds.merge" 
            min="0.3" max="0.9" step="0.05"
            @change="updateThresholds"
          />
          <p class="setting-description">
            Minimum composite score required to accept a merge proposal.
          </p>
        </div>

        <div class="threshold-setting">
          <label>Max Gap (bars): {{ thresholds.maxGapBars }}</label>
          <input 
            type="range" 
            v-model.number="thresholds.maxGapBars" 
            min="1" max="8" step="1"
            @change="updateThresholds"
          />
          <p class="setting-description">
            Maximum bar gap allowed for temporal continuity.
          </p>
        </div>
      </div>

      <!-- Presets -->
      <div class="setting-group">
        <h3>Form Presets</h3>
        <select v-model="selectedPreset" @change="applyPreset">
          <option value="">-- Select Preset --</option>
          <option value="sonata">Sonata Form</option>
          <option value="rondo">Rondo Form</option>
          <option value="binary">Binary Form</option>
          <option value="ternary">Ternary Form</option>
          <option value="verse-chorus">Verse-Chorus (Pop)</option>
        </select>
        <p class="setting-description">
          Apply optimized settings for specific musical forms.
        </p>
      </div>

      <!-- Cache Management -->
      <div class="setting-group">
        <h3>Cache Management</h3>
        <div class="cache-info">
          <span>Cached data: {{ cacheSize }}</span>
        </div>
        <button class="btn btn-secondary" @click="clearCache">
          Clear Cache
        </button>
        <p class="setting-description">
          Clear cached model weights and analysis results to free up storage.
        </p>
      </div>

      <!-- About -->
      <div class="setting-group">
        <h3>About</h3>
        <p class="about-text">
          Music Structure Tree v1.0.0<br>
          AI-powered musical structure analysis and visualization for education.
        </p>
        <p class="about-text">
          Uses TensorFlow.js, Magenta.js, and music theory rules to analyze compositions.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { useAppStore } from '../stores/appStore';
import { CacheManager } from '../services/CacheManager';

export default {
  name: 'SettingsView',
  setup() {
    const store = useAppStore();
    
    const lightweightMode = ref(store.lightweightMode);
    const rules = reactive({ ...store.ruleConfig.enabled });
    const thresholds = reactive({ ...store.ruleConfig.thresholds });
    const selectedPreset = ref('');
    const cacheSize = ref('Calculating...');

    const presets = {
      sonata: {
        weights: { temporal: 0.25, tonal: 0.30, development: 0.30, level: 0.15 },
        thresholds: { merge: 0.6, maxGapBars: 4 }
      },
      rondo: {
        weights: { temporal: 0.30, tonal: 0.25, development: 0.30, level: 0.15 },
        thresholds: { merge: 0.55, maxGapBars: 3 }
      },
      binary: {
        weights: { temporal: 0.35, tonal: 0.25, development: 0.25, level: 0.15 },
        thresholds: { merge: 0.65, maxGapBars: 2 }
      },
      ternary: {
        weights: { temporal: 0.30, tonal: 0.25, development: 0.30, level: 0.15 },
        thresholds: { merge: 0.6, maxGapBars: 3 }
      },
      'verse-chorus': {
        weights: { temporal: 0.35, tonal: 0.20, development: 0.30, level: 0.15 },
        thresholds: { merge: 0.5, maxGapBars: 4 }
      }
    };

    const updateLightweightMode = () => {
      store.setLightweightMode(lightweightMode.value);
    };

    const updateRules = () => {
      store.updateRuleConfig({ enabled: { ...rules } });
    };

    const updateThresholds = () => {
      store.updateRuleThresholds({ ...thresholds });
    };

    const applyPreset = () => {
      if (!selectedPreset.value) return;
      
      const preset = presets[selectedPreset.value];
      if (preset) {
        store.updateRuleWeights(preset.weights);
        store.updateRuleThresholds(preset.thresholds);
        thresholds.merge = preset.thresholds.merge;
        thresholds.maxGapBars = preset.thresholds.maxGapBars;
        
        store.addMessage({
          type: 'success',
          title: 'Preset Applied',
          message: `${selectedPreset.value} preset settings applied.`,
          persistent: true
        });
      }
    };

    const clearCache = async () => {
      try {
        await CacheManager.clearAll();
        cacheSize.value = '0 KB';
        store.addMessage({
          type: 'success',
          title: 'Cache Cleared',
          message: 'All cached data has been cleared.',
          persistent: true
        });
      } catch (error) {
        store.addMessage({
          type: 'error',
          title: 'Clear Failed',
          message: 'Failed to clear cache: ' + error.message,
          persistent: true
        });
      }
    };

    const updateCacheSize = async () => {
      try {
        const size = await CacheManager.getSize();
        if (size < 1024) {
          cacheSize.value = `${size} B`;
        } else if (size < 1024 * 1024) {
          cacheSize.value = `${(size / 1024).toFixed(1)} KB`;
        } else {
          cacheSize.value = `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }
      } catch (error) {
        cacheSize.value = 'Unknown';
      }
    };

    onMounted(() => {
      updateCacheSize();
    });

    return {
      lightweightMode,
      rules,
      thresholds,
      selectedPreset,
      cacheSize,
      updateLightweightMode,
      updateRules,
      updateThresholds,
      applyPreset,
      clearCache
    };
  }
};
</script>

<style scoped>
.settings-view {
  max-width: 600px;
  margin: 0 auto;
}

.settings-section h2 {
  margin-bottom: 1.5rem;
  color: var(--primary-dark);
}

.setting-group {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.setting-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.setting-group h3 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--text-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.setting-description {
  font-size: 0.85rem;
  color: var(--text-light);
  margin-top: 0.5rem;
}

.rule-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.threshold-setting {
  margin-bottom: 1rem;
}

.threshold-setting label {
  display: block;
  margin-bottom: 0.25rem;
}

.threshold-setting input[type="range"] {
  width: 100%;
}

.cache-info {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.about-text {
  font-size: 0.9rem;
  color: var(--text-light);
  margin-bottom: 0.5rem;
}
</style>
