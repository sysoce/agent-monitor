import type { AppState } from './types';
import { renderNavHeader } from './components/navHeader';
import { renderComposerView } from './components/composerView';
import { updateNavHeaderDOM } from './navHeaderDomUpdater';
import { updateSidebarDOM } from './sidebarDomUpdater';
import { updateChatDOM } from './chatDomUpdater';
import { updateComposerDOM } from './composerDomUpdater';
import { updateSettingsModalDOM, initModalSectionsCache } from './settingsModalDomUpdater';

function updateMainViewDOM(state: AppState, mainEl: HTMLElement, mainHtml: string): boolean {
  if (mainEl.dataset.activeTab !== state.activeTab) {
    mainEl.innerHTML = mainHtml;
    mainEl.dataset.activeTab = state.activeTab;
    mainEl.dataset.renderedHtml = mainHtml;
    return true;
  }

  if (state.activeTab === 'chat' && !state.activePlan) {
    updateChatDOM(state, mainEl);
    return false;
  }

  if (state.activeTab === 'sidebar') {
    updateSidebarDOM(state, mainEl);
    return false;
  }

  if (mainEl.dataset.renderedHtml !== mainHtml) {
    mainEl.innerHTML = mainHtml;
    mainEl.dataset.renderedHtml = mainHtml;
    return true;
  }

  return false;
}

export function updateLayoutDOM(
  app: HTMLElement,
  state: AppState,
  mainHtml: string,
  settingsModalHtml: string
): boolean {
  const existingLayout = app.querySelector('.app-layout');

  if (!existingLayout) {
    app.innerHTML = `
      <div class="app-layout">
        <div id="nav-container">${renderNavHeader(state)}</div>
        <main class="app-main" data-active-tab="${state.activeTab}">${mainHtml}</main>
        ${renderComposerView(state)}
        <div id="modal-container">${settingsModalHtml}</div>
      </div>
    `;
    const navEl = app.querySelector<HTMLElement>('#nav-container');
    if (navEl) navEl.dataset.renderedHtml = renderNavHeader(state);
    const mainEl = app.querySelector<HTMLElement>('.app-main');
    if (mainEl) mainEl.dataset.renderedHtml = mainHtml;
    const modalEl = app.querySelector<HTMLElement>('#modal-container');
    if (modalEl) {
      modalEl.dataset.renderedHtml = settingsModalHtml;
      if (settingsModalHtml) initModalSectionsCache(modalEl, state);
    }
    return true;
  }

  const navContainer = existingLayout.querySelector<HTMLElement>('#nav-container');
  if (navContainer) {
    updateNavHeaderDOM(state, navContainer);
  }

  const mainEl = existingLayout.querySelector<HTMLElement>('.app-main');
  const mainUpdated = mainEl ? updateMainViewDOM(state, mainEl, mainHtml) : false;

  const composerEl = existingLayout.querySelector<HTMLElement>('.app-composer');
  const newComposerHtml = renderComposerView(state);
  if (composerEl && newComposerHtml) {
    updateComposerDOM(state, composerEl);
  } else if (composerEl && !newComposerHtml) {
    composerEl.remove();
  } else if (!composerEl && newComposerHtml) {
    existingLayout.insertAdjacentHTML('beforeend', newComposerHtml);
  }

  const modalContainer = existingLayout.querySelector<HTMLElement>('#modal-container');
  if (modalContainer) {
    if (modalContainer.dataset.renderedHtml !== settingsModalHtml) {
      const existingModal = modalContainer.querySelector<HTMLElement>('#settings-modal, #qr-modal');
      if (settingsModalHtml && existingModal) {
        updateSettingsModalDOM(state, existingModal);
        modalContainer.dataset.renderedHtml = settingsModalHtml;
      } else {
        modalContainer.innerHTML = settingsModalHtml;
        modalContainer.dataset.renderedHtml = settingsModalHtml;
        if (settingsModalHtml) initModalSectionsCache(modalContainer, state);
      }
    }
  }

  return mainUpdated;
}
