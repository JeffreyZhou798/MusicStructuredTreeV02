<template>
  <div class="pattern-legend">
    <button class="legend-toggle" @click="showLegend = !showLegend">
      {{ showLegend ? 'Hide' : 'Show' }} Legend
    </button>
    
    <div v-if="showLegend" class="legend-content">
      <h4>Visual Guide</h4>
      
      <div class="legend-section">
        <h5>Structure Levels</h5>
        <div class="legend-item">
          <svg width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="#4a90e2" />
          </svg>
          <span>Motive (2-6 notes)</span>
        </div>
        <div class="legend-item">
          <svg width="48" height="24">
            <circle cx="10" cy="12" r="6" fill="#4a90e2" />
            <circle cx="26" cy="12" r="6" fill="#4a90e2" />
            <circle cx="42" cy="12" r="6" fill="#4a90e2" />
          </svg>
          <span>Phrase (4-8 bars)</span>
        </div>
        <div class="legend-item">
          <svg width="48" height="36">
            <circle cx="10" cy="10" r="5" fill="#2c5aa0" />
            <circle cx="26" cy="10" r="5" fill="#2c5aa0" />
            <circle cx="42" cy="10" r="5" fill="#2c5aa0" />
            <circle cx="10" cy="26" r="5" fill="#2c5aa0" />
            <circle cx="26" cy="26" r="5" fill="#2c5aa0" />
            <circle cx="42" cy="26" r="5" fill="#2c5aa0" />
          </svg>
          <span>Theme/Period</span>
        </div>
      </div>

      <div class="legend-section">
        <h5>Relationships (Color)</h5>
        <div class="legend-item">
          <div class="color-swatch" style="background: #4a90e2;"></div>
          <span>Similar / Repetition</span>
        </div>
        <div class="legend-item">
          <div class="color-swatch" style="background: #e24a4a;"></div>
          <span>Contrast</span>
        </div>
        <div class="legend-item">
          <div class="color-swatch" style="background: #4ae290;"></div>
          <span>Variation</span>
        </div>
      </div>

      <div class="legend-section">
        <h5>Confidence</h5>
        <div class="legend-item">
          <svg width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="#4a90e2" opacity="1.0" stroke="#000" stroke-width="2" />
          </svg>
          <span>High (≥80%)</span>
        </div>
        <div class="legend-item">
          <svg width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="#4a90e2" opacity="0.6" stroke="#000" stroke-width="1" />
          </svg>
          <span>Medium (60-80%)</span>
        </div>
        <div class="legend-item">
          <svg width="24" height="24">
            <circle cx="12" cy="12" r="8" fill="#4a90e2" opacity="0.3" stroke="#000" stroke-width="1" stroke-dasharray="3,3" />
          </svg>
          <span>Low (&lt;60%)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'PatternLegend',
  setup() {
    const showLegend = ref(false);
    return { showLegend };
  }
};
</script>

<style scoped>
.pattern-legend {
  position: relative;
}

.legend-toggle {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--text-light);
}

.legend-toggle:hover {
  background: var(--bg-color);
}

.legend-content {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  min-width: 220px;
}

.legend-content h4 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: var(--primary-dark);
}

.legend-section {
  margin-bottom: 1rem;
}

.legend-section:last-child {
  margin-bottom: 0;
}

.legend-section h5 {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
</style>
