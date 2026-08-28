import type { AppState } from './types';
import { renderModelMenuItemsHtml } from './components/modelPickerDropdown';

export interface ModelPickerCallbacks {
  onSelectModel?: (modelId: string) => void;
  onRender: () => void;
}

export function handleModelPickerClick(
  target: HTMLElement,
  state: AppState,
  callbacks: ModelPickerCallbacks
): boolean {
  const toggleBtn = target.closest<HTMLElement>('#btn-model-toggle, .model-picker-btn');
  if (toggleBtn) {
    state.isModelPickerOpen = !state.isModelPickerOpen;
    if (state.isModelPickerOpen) state.modelSearchQuery = '';
    callbacks.onRender();
    if (state.isModelPickerOpen && typeof document !== 'undefined') {
      setTimeout(() => {
        (document.getElementById('model-search-input') as HTMLInputElement | null)?.focus();
      }, 0);
    }
    return true;
  }

  const modelItem = target.closest<HTMLElement>('.model-picker-item, [data-model-id]');
  if (modelItem) {
    const modelId = modelItem.getAttribute('data-model-id');
    if (modelId) {
      state.selectedModel = modelId;
      state.isModelPickerOpen = false;
      state.modelSearchQuery = '';
      callbacks.onSelectModel?.(modelId);
      callbacks.onRender();
      return true;
    }
  }

  if (target.closest('.model-picker-menu, .model-picker-dropdown')) {
    return true;
  }

  if (state.isModelPickerOpen && !target.closest('.model-picker-wrapper')) {
    state.isModelPickerOpen = false;
    callbacks.onRender();
    return false;
  }

  return false;
}

export function filterModelListInPlace(state: AppState): void {
  if (typeof document === 'undefined') return;
  const list = document.getElementById('model-menu-list');
  if (list) {
    list.innerHTML = renderModelMenuItemsHtml(state);
  }
}

export function handleModelMenuKeyboardNav(direction: 'ArrowDown' | 'ArrowUp'): void {
  if (typeof document === 'undefined') return;
  const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.model-picker-item'));
  if (items.length === 0) return;
  const activeIdx = items.findIndex((el) => el === document.activeElement);
  if (direction === 'ArrowDown') {
    const nextIdx = activeIdx < items.length - 1 ? activeIdx + 1 : 0;
    items[nextIdx]?.focus();
  } else {
    const prevIdx = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
    items[prevIdx]?.focus();
  }
}

export function setupModelSearchInput(state: AppState, callbacks: ModelPickerCallbacks): void {
  if (typeof document === 'undefined') return;
  const searchInput = document.getElementById('model-search-input') as HTMLInputElement | null;
  if (!searchInput || searchInput.dataset.bound) return;
  searchInput.dataset.bound = 'true';

  searchInput.addEventListener('input', () => {
    state.modelSearchQuery = searchInput.value;
    filterModelListInPlace(state);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      state.isModelPickerOpen = false;
      callbacks.onRender();
      (document.getElementById('composer-input') as HTMLTextAreaElement | null)?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleModelMenuKeyboardNav(e.key);
    } else if (e.key === 'Enter') {
      const firstItem = document.querySelector<HTMLElement>('.model-picker-item');
      if (firstItem) firstItem.click();
    }
  });
}

export function bindModelPickerEvents(state: AppState, callbacks: ModelPickerCallbacks): void {
  setupModelSearchInput(state, callbacks);
}

