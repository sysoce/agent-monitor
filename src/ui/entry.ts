import type { AppState } from './types';
import { AppController } from './appController';
import { renderNavHeader } from './components/navHeader';
import { renderSidebarView } from './components/sidebarView';
import { renderChatView } from './components/chatView';
import { renderPlanView } from './components/planView';
import { renderComposerView } from './components/composerView';
import { renderLoginView } from './components/loginView';
import { renderSettingsModal } from './components/settingsModal';
import { bindLoginEvents, bindAppEvents } from './eventHandlers';
import { captureFocusState, restoreFocusState, restoreScrollState } from './domFocusPreserver';
import { getSavedTab } from './tabStore';
import { initViewportManager } from './viewportManager';
import { hydrateAllDiagrams } from './markdown/diagram/diagramHydrator';
import { updateComposerDOM } from './composerDomUpdater';

initViewportManager();

const state: AppState = {
  activeTab: getSavedTab() || 'sidebar',
  sessions: [],
  plans: [],
  syncStatus: 'connecting',
  searchQuery: '',
  composerMode: 'agent',
  selectedModel: 'antigravity|gemini-3.7-flash-high|model',
  availableModels: [],
  isSending: false,
  isAuthenticated: false,
  attachments: [],
  isLoadingSessions: true,
};

const controller = new AppController(state, render);

if (typeof window !== 'undefined') {
  (window as any).__state = state;
  (window as any).renderApp = render;
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const focusSnapshot = captureFocusState();

  if (focusSnapshot.activeElementId === 'composer-input' && focusSnapshot.value !== null) {
    state.composerDraft = focusSnapshot.value;
  } else if (focusSnapshot.activeElementId === 'session-search' && focusSnapshot.value !== null) {
    state.searchQuery = focusSnapshot.value;
  } else if (focusSnapshot.activeElementId === 'model-search-input' && focusSnapshot.value !== null) {
    state.modelSearchQuery = focusSnapshot.value;
  }

  if (!state.isAuthenticated) {
    app.innerHTML = renderLoginView(state);
    bindLoginEvents(state, {
      onSelectSession: (id) => controller.selectSession(id),
      onNewSession: () => controller.handleNewSession(),
      onSendMessage: () => controller.handleSendMessage(),
      onSelectPlan: (name) => controller.selectPlan(name),
      onLoginSuccess: async () => {
        await controller.handleLoginSuccess();
      },
      onRender: render,
    });
    restoreFocusState(focusSnapshot);
    return;
  }

  let mainHtml = '';
  if (state.activeTab === 'sidebar') mainHtml = renderSidebarView(state);
  else if (state.activeTab === 'chat') mainHtml = renderChatView(state);
  else if (state.activeTab === 'plans') mainHtml = renderPlanView(state);

  const settingsModalHtml = renderSettingsModal(state);
  const existingLayout = app.querySelector('.app-layout');
  let mainUpdated = false;
  if (!existingLayout) {
    app.innerHTML = `
      <div class="app-layout">
        ${renderNavHeader(state)}
        <main class="app-main">${mainHtml}</main>
        ${renderComposerView(state)}
        ${settingsModalHtml}
      </div>
    `;
    mainUpdated = true;
  } else {
    const navEl = existingLayout.querySelector('.app-header, .app-nav-header');
    const newNavHtml = renderNavHeader(state);
    if (navEl && navEl.outerHTML !== newNavHtml) {
      navEl.outerHTML = newNavHtml;
    }

    const mainEl = existingLayout.querySelector<HTMLElement>('.app-main');
    if (mainEl && mainEl.dataset.renderedHtml !== mainHtml) {
      mainEl.innerHTML = mainHtml;
      mainEl.dataset.renderedHtml = mainHtml;
      mainUpdated = true;
    }

    const composerEl = existingLayout.querySelector<HTMLElement>('.app-composer');
    const newComposerHtml = renderComposerView(state);
    if (composerEl && newComposerHtml) {
      updateComposerDOM(state, composerEl);
    } else if (composerEl && !newComposerHtml) {
      composerEl.remove();
    } else if (!composerEl && newComposerHtml) {
      existingLayout.insertAdjacentHTML('beforeend', newComposerHtml);
    }

    const modalEl = existingLayout.querySelector('#settings-modal, #qr-modal');
    if (settingsModalHtml) {
      if (modalEl) {
        modalEl.outerHTML = settingsModalHtml;
      } else {
        existingLayout.insertAdjacentHTML('beforeend', settingsModalHtml);
      }
    } else if (modalEl) {
      modalEl.remove();
    }
  }

  bindAppEvents(state, {
    onSelectSession: (id) => controller.selectSession(id),
    onNewSession: () => controller.handleNewSession(),
    onSendMessage: () => controller.handleSendMessage(),
    onBuildPlan: (path, title) => controller.handleBuildPlan(path, title),
    onStopSession: () => controller.handleStopSession(),
    onResolveApproval: (cmdId, allowed) => controller.handleResolveApproval(cmdId, allowed),
    onSelectModel: (modelId) => controller.handleSelectModel(modelId),
    onSelectPlan: (name) => controller.selectPlan(name),
    onLoginSuccess: async () => {},
    onLogout: () => controller.handleLogout(),
    onToggleSyncMode: () => controller.toggleSyncMode(),
    onRender: render,
  });

  restoreScrollState(focusSnapshot, state.activeTab);
  restoreFocusState(focusSnapshot);
  if (mainUpdated) {
    hydrateAllDiagrams(app);
  }

  if (typeof window !== 'undefined') {
    (window as any).__state = state;
    (window as any).renderApp = render;
  }
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void controller.init();
  });
} else {
  void controller.init();
}


