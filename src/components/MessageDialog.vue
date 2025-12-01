<template>
  <div class="message-container">
    <transition-group name="message">
      <div 
        v-for="message in visibleMessages" 
        :key="message.id"
        :class="['message-dialog', `message-${message.type}`]"
      >
        <div class="message-icon">
          <span v-if="message.type === 'success'">✓</span>
          <span v-else-if="message.type === 'error'">✕</span>
          <span v-else-if="message.type === 'warning'">⚠</span>
          <span v-else>ℹ</span>
        </div>
        <div class="message-content">
          <div v-if="message.title" class="message-title">{{ message.title }}</div>
          <div class="message-text">{{ message.message }}</div>
          <div v-if="message.details" class="message-details">
            <button class="details-toggle" @click="toggleDetails(message.id)">
              {{ expandedDetails.has(message.id) ? 'Hide Details' : 'Show Details' }}
            </button>
            <pre v-if="expandedDetails.has(message.id)" class="details-content">{{ message.details }}</pre>
          </div>
          <div v-if="message.actions && message.actions.length" class="message-actions">
            <button 
              v-for="action in message.actions" 
              :key="action.label"
              class="action-btn"
              @click="executeAction(action, message.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button 
          class="message-close"
          @click="dismissMessage(message.id)"
          aria-label="Dismiss message"
        >
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/appStore';

export default {
  name: 'MessageDialog',
  setup() {
    const store = useAppStore();
    const expandedDetails = ref(new Set());

    const visibleMessages = computed(() => store.visibleMessages);

    const dismissMessage = (id) => {
      store.dismissMessage(id);
    };

    const toggleDetails = (id) => {
      if (expandedDetails.value.has(id)) {
        expandedDetails.value.delete(id);
      } else {
        expandedDetails.value.add(id);
      }
    };

    const executeAction = (action, messageId) => {
      if (typeof action.action === 'function') {
        action.action();
      } else if (action.action === 'dismiss') {
        dismissMessage(messageId);
      }
    };

    return {
      visibleMessages,
      expandedDetails,
      dismissMessage,
      toggleDetails,
      executeAction
    };
  }
};
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 400px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.message-dialog {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius);
  background: var(--bg-white);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid;
}

.message-success {
  border-left-color: var(--success-color);
}

.message-error {
  border-left-color: var(--error-color);
}

.message-warning {
  border-left-color: var(--warning-color);
}

.message-info {
  border-left-color: var(--info-color);
}

.message-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
  flex-shrink: 0;
}

.message-success .message-icon {
  background: rgba(40, 167, 69, 0.1);
  color: var(--success-color);
}

.message-error .message-icon {
  background: rgba(220, 53, 69, 0.1);
  color: var(--error-color);
}

.message-warning .message-icon {
  background: rgba(255, 193, 7, 0.1);
  color: var(--warning-color);
}

.message-info .message-icon {
  background: rgba(23, 162, 184, 0.1);
  color: var(--info-color);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.message-text {
  font-size: 0.9rem;
  color: var(--text-color);
}

.message-details {
  margin-top: 0.5rem;
}

.details-toggle {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}

.details-toggle:hover {
  text-decoration: underline;
}

.details-content {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-color);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  overflow-x: auto;
  max-height: 150px;
  overflow-y: auto;
}

.message-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.action-btn {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-white);
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--transition);
}

.action-btn:hover {
  background: var(--bg-color);
}

.message-close {
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
}

.message-close:hover {
  color: var(--text-color);
}

/* Transitions */
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
