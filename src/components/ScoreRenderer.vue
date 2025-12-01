<template>
  <div class="score-renderer">
    <div ref="scoreContainer" class="score-container" @click="handleScoreClick">
      <!-- Measure overlays for click detection -->
      <div 
        v-for="measure in measureOverlays" 
        :key="measure.number"
        class="measure-overlay"
        :class="{ 
          'highlighted': highlightMeasures.includes(measure.number),
          'current': currentMeasure === measure.number
        }"
        :style="measure.style"
        @click.stop="handleMeasureClick(measure.number)"
        :title="`Measure ${measure.number}`"
      >
        <span class="measure-number">{{ measure.number }}</span>
      </div>
      
      <!-- Playhead indicator on score -->
      <div 
        v-if="playheadPosition !== undefined && playheadMeasureX !== null"
        class="score-playhead"
        :style="{ left: playheadMeasureX + 'px' }"
      ></div>
    </div>
    
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>Loading score...</span>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, onUnmounted, computed, nextTick } from 'vue';

export default {
  name: 'ScoreRenderer',
  props: {
    score: {
      type: Object,
      default: null
    },
    highlightMeasures: {
      type: Array,
      default: () => []
    },
    currentMeasure: {
      type: Number,
      default: 1
    },
    playheadPosition: {
      type: Number,
      default: 0
    }
  },
  emits: ['measure-click'],
  setup(props, { emit, expose }) {
    const scoreContainer = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const measureOverlays = ref([]);
    let osmd = null;

    const playheadMeasureX = computed(() => {
      if (!props.score || !props.score.measures) return null;
      
      const measures = props.score.measures;
      const totalDuration = measures[measures.length - 1]?.endTime || 1;
      const currentTime = props.playheadPosition;
      
      // Find current measure based on time
      let currentMeasureData = measures[0];
      for (const measure of measures) {
        if (measure.startTime <= currentTime) {
          currentMeasureData = measure;
        } else {
          break;
        }
      }
      
      // Calculate position within measure
      const measureDuration = currentMeasureData.endTime - currentMeasureData.startTime;
      const timeInMeasure = currentTime - currentMeasureData.startTime;
      const measureProgress = measureDuration > 0 ? timeInMeasure / measureDuration : 0;
      
      // Find overlay for this measure
      const overlay = measureOverlays.value.find(m => m.number === currentMeasureData.number);
      if (!overlay) return null;
      
      const left = parseFloat(overlay.style.left);
      const width = parseFloat(overlay.style.width);
      
      return left + (width * measureProgress);
    });

    const initializeOSMD = async () => {
      if (!scoreContainer.value) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        // Dynamic import of OpenSheetMusicDisplay
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        
        osmd = new OpenSheetMusicDisplay(scoreContainer.value, {
          autoResize: true,
          drawTitle: true,
          drawSubtitle: true,
          drawComposer: true,
          drawingParameters: 'default'
        });
        
        if (props.score?.xmlContent) {
          await osmd.load(props.score.xmlContent);
          osmd.render();
          await nextTick();
          updateMeasureOverlays();
        }
      } catch (err) {
        console.error('Failed to initialize OSMD:', err);
        error.value = 'Failed to load score renderer. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    const updateMeasureOverlays = () => {
      if (!osmd || !osmd.graphic) {
        measureOverlays.value = [];
        return;
      }

      const overlays = [];
      const measureList = osmd.graphic.measureList;
      
      if (!measureList) {
        measureOverlays.value = [];
        return;
      }

      for (let i = 0; i < measureList.length; i++) {
        try {
          const measureStaves = measureList[i];
          if (!measureStaves || measureStaves.length === 0) continue;
          
          const measure = measureStaves[0];
          if (!measure || !measure.stave) continue;
          
          const bbox = measure.stave.getBoundingBox();
          if (!bbox) continue;

          overlays.push({
            number: i + 1,
            style: {
              position: 'absolute',
              left: `${bbox.x}px`,
              top: `${bbox.y}px`,
              width: `${bbox.width}px`,
              height: `${bbox.height}px`
            }
          });
        } catch (e) {
          // Skip measures that can't be processed
        }
      }

      measureOverlays.value = overlays;
    };

    const scrollToMeasure = (measureNum) => {
      if (!osmd || !osmd.graphic || !scoreContainer.value) return;
      
      try {
        const measureIndex = measureNum - 1;
        const measureList = osmd.graphic.measureList;
        
        if (measureIndex >= 0 && measureList && measureList[measureIndex]) {
          const measure = measureList[measureIndex][0];
          if (measure && measure.stave) {
            const bbox = measure.stave.getBoundingBox();
            scoreContainer.value.scrollTo({
              left: Math.max(0, bbox.x - 50),
              top: Math.max(0, bbox.y - 50),
              behavior: 'smooth'
            });
          }
        }
      } catch (e) {
        console.warn('Could not scroll to measure:', e);
      }
    };

    const handleScoreClick = (e) => {
      // Handle clicks on the score area
    };

    const handleMeasureClick = (measureNum) => {
      emit('measure-click', measureNum);
    };

    watch(() => props.score, async (newScore) => {
      if (newScore && osmd) {
        loading.value = true;
        try {
          await osmd.load(newScore.xmlContent);
          osmd.render();
          await nextTick();
          updateMeasureOverlays();
        } catch (err) {
          error.value = 'Failed to render score.';
        } finally {
          loading.value = false;
        }
      }
    });

    watch(() => props.highlightMeasures, () => {
      // Highlights are handled via CSS classes
      if (props.highlightMeasures.length > 0) {
        scrollToMeasure(props.highlightMeasures[0]);
      }
    }, { deep: true });

    onMounted(() => {
      initializeOSMD();
    });

    onUnmounted(() => {
      osmd = null;
    });

    // Expose methods for parent component
    expose({
      scrollToMeasure
    });

    return {
      scoreContainer,
      loading,
      error,
      measureOverlays,
      playheadMeasureX,
      handleScoreClick,
      handleMeasureClick,
      scrollToMeasure
    };
  }
};
</script>

<style scoped>
.score-renderer {
  position: relative;
  width: 100%;
  min-height: 200px;
}

.score-container {
  width: 100%;
  overflow: auto;
  position: relative;
  min-height: 200px;
}

.measure-overlay {
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 2px;
  z-index: 5;
}

.measure-overlay:hover {
  background: rgba(74, 144, 226, 0.1);
}

.measure-overlay.highlighted {
  background: rgba(74, 144, 226, 0.2);
  border: 2px solid var(--primary-color);
}

.measure-overlay.current {
  background: rgba(255, 193, 7, 0.2);
  border: 2px solid #ffc107;
}

.measure-overlay.highlighted.current {
  background: rgba(74, 144, 226, 0.3);
  border: 2px solid var(--primary-color);
}

.measure-number {
  position: absolute;
  top: -18px;
  left: 2px;
  font-size: 0.7rem;
  color: var(--text-light);
  background: white;
  padding: 0 4px;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.measure-overlay:hover .measure-number,
.measure-overlay.highlighted .measure-number,
.measure-overlay.current .measure-number {
  opacity: 1;
}

.score-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #ff5722;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(255, 87, 34, 0.5);
}

.score-playhead::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #ff5722;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  gap: 1rem;
  z-index: 20;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 1rem;
  text-align: center;
  color: var(--error-color);
}
</style>
