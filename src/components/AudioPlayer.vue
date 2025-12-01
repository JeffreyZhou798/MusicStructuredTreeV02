<template>
  <div class="audio-player">
    <div class="player-controls">
      <button 
        class="control-btn play-btn"
        :class="{ active: isPlaying }"
        @click="togglePlay"
        :disabled="!buffer"
      >
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button 
        class="control-btn"
        @click="stop"
        :disabled="!buffer"
      >
        ⏹
      </button>
    </div>

    <div class="player-progress">
      <div class="time-display">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>
      <div 
        class="progress-track"
        @click="handleSeekClick"
      >
        <div 
          class="progress-fill"
          :style="{ width: progressPercent + '%' }"
        ></div>
        <div 
          v-if="startTime > 0 || endTime < duration"
          class="segment-indicator"
          :style="segmentStyle"
        ></div>
      </div>
    </div>

    <div class="segment-info" v-if="startTime > 0 || endTime < duration">
      <span>Segment: {{ formatTime(startTime) }} - {{ formatTime(endTime) }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export default {
  name: 'AudioPlayer',
  props: {
    buffer: {
      type: Object,
      default: null
    },
    startTime: {
      type: Number,
      default: 0
    },
    endTime: {
      type: Number,
      default: 0
    }
  },
  emits: ['progress', 'time-update', 'play-state-change'],
  setup(props, { emit, expose }) {
    const isPlaying = ref(false);
    const currentTime = ref(0);
    let audioContext = null;
    let sourceNode = null;
    let startedAt = 0;
    let pausedAt = 0;
    let animationFrame = null;

    const duration = computed(() => {
      return props.buffer?.duration || 0;
    });

    const progressPercent = computed(() => {
      if (duration.value === 0) return 0;
      return (currentTime.value / duration.value) * 100;
    });

    const segmentStyle = computed(() => {
      if (duration.value === 0) return {};
      const left = (props.startTime / duration.value) * 100;
      const width = ((props.endTime - props.startTime) / duration.value) * 100;
      return {
        left: left + '%',
        width: width + '%'
      };
    });

    const initAudioContext = () => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioContext;
    };

    const play = async () => {
      if (!props.buffer) return;
      
      const ctx = initAudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
      }

      sourceNode = ctx.createBufferSource();
      sourceNode.buffer = props.buffer;
      sourceNode.connect(ctx.destination);

      const offset = pausedAt || props.startTime;
      const playDuration = props.endTime > 0 ? props.endTime - offset : undefined;

      sourceNode.start(0, offset, playDuration);
      startedAt = ctx.currentTime - offset;
      pausedAt = 0;
      isPlaying.value = true;
      emit('play-state-change', true);

      sourceNode.onended = () => {
        if (isPlaying.value) {
          stop();
        }
      };

      updateProgress();
    };

    const pause = () => {
      if (!audioContext || !sourceNode) return;
      
      pausedAt = audioContext.currentTime - startedAt;
      sourceNode.stop();
      sourceNode.disconnect();
      sourceNode = null;
      isPlaying.value = false;
      emit('play-state-change', false);
      
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };

    const stop = () => {
      if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
        sourceNode = null;
      }
      
      isPlaying.value = false;
      emit('play-state-change', false);
      pausedAt = 0;
      currentTime.value = props.startTime;
      emit('time-update', currentTime.value);
      
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };

    const togglePlay = () => {
      if (isPlaying.value) {
        pause();
      } else {
        play();
      }
    };

    const seekTo = (time) => {
      pausedAt = Math.max(0, Math.min(time, duration.value));
      currentTime.value = pausedAt;
      emit('time-update', currentTime.value);
      
      if (isPlaying.value) {
        pause();
        play();
      }
    };

    const handleSeekClick = (event) => {
      const rect = event.target.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const seekTime = percent * duration.value;
      seekTo(seekTime);
    };

    const updateProgress = () => {
      if (!isPlaying.value || !audioContext) return;
      
      currentTime.value = audioContext.currentTime - startedAt;
      emit('progress', currentTime.value);
      emit('time-update', currentTime.value);
      
      if (props.endTime > 0 && currentTime.value >= props.endTime) {
        stop();
        return;
      }
      
      animationFrame = requestAnimationFrame(updateProgress);
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    watch(() => props.startTime, () => {
      if (!isPlaying.value) {
        currentTime.value = props.startTime;
        pausedAt = props.startTime;
      }
    });

    onMounted(() => {
      currentTime.value = props.startTime;
    });

    onUnmounted(() => {
      stop();
      if (audioContext) {
        audioContext.close();
      }
    });

    // Expose methods for parent component
    expose({
      play,
      pause,
      stop,
      seekTo
    });

    return {
      isPlaying,
      currentTime,
      duration,
      progressPercent,
      segmentStyle,
      togglePlay,
      stop,
      handleSeekClick,
      formatTime
    };
  }
};
</script>

<style scoped>
.audio-player {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.player-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--bg-color);
  cursor: pointer;
  font-size: 1rem;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn.active {
  background: var(--primary-color);
  color: white;
}

.player-progress {
  flex: 1;
}

.time-display {
  font-size: 0.8rem;
  color: var(--text-light);
  margin-bottom: 0.25rem;
}

.progress-track {
  position: relative;
  height: 8px;
  background: var(--bg-color);
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
  transition: width 0.1s linear;
}

.segment-indicator {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(74, 144, 226, 0.3);
  border-left: 2px solid var(--primary-color);
  border-right: 2px solid var(--primary-color);
}

.segment-info {
  font-size: 0.8rem;
  color: var(--text-light);
}
</style>
