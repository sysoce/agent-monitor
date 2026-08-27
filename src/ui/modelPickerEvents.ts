import type { AppState } from './types';

export interface ModelPickerCallbacks {
  onSelectModel?: (modelId: string) => void;
  onRender: () => void;
}

export function bindModelPickerEvents(state: AppState, callbacks: ModelPickerCallbacks): void {
  const toggleBtn = document.getElementById('btn-model-toggle');
  toggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.isModelPickerOpen = !state.isModelPickerOpen;
    callbacks.onRender();
    if (state.isModelPickerOpen) {
      setTimeout(() => {
        const input = document.getElementById('model-search-input') as HTMLInputElement | null;
        input?.focus();
      }, 0);
    }
  });

  const searchInput = document.getElementById('model-search-input') as HTMLInputElement | null;
  searchInput?.addEventListener('input', () => {
    state.modelSearchQuery = searchInput.value;
    callbacks.onRender();
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      state.isModelPickerOpen = false;
      callbacks.onRender();
      document.getElementById('composer-input')?.focus();
    }
  });

  document.querySelectorAll('.model-picker-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const modelId = item.getAttribute('data-model-id');
      if (modelId) {
        state.selectedModel = modelId;
        state.isModelPickerOpen = false;
        state.modelSearchQuery = '';
        callbacks.onSelectModel?.(modelId);
        callbacks.onRender();
      }
    });
  });

  if (state.isModelPickerOpen) {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.model-picker-wrapper')) {
        state.isModelPickerOpen = false;
        document.removeEventListener('click', handleOutsideClick);
        callbacks.onRender();
      }
    };
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick, { once: true });
    }, 0);
  }
}
