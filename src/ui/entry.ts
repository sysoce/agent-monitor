import type { AppState } from './types';
import { AppController } from './appController';
import { renderSidebarView } from './components/sidebarView';
import { renderChatView } from './components/chatView';
import { renderPlanView } from './components/planView';
import { renderLoginView } from './components/loginView';
import { renderSettingsModal } from './components/settingsModal';
import { updateLayoutDOM } from './layoutDomUpdater';
import { bindLoginEvents, bindAppEvents } from './eventHandlers';
import { captureFocusState, restoreFocusState, restoreScrollState } from './domFocusPreserver';
import { getSavedTab } from './tabStore';
import { initViewportManager } from './viewportManager';
import { hydrateAllDiagrams } from './markdown/diagram/diagramHydrator';

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
  const mainUpdated = updateLayoutDOM(app, state, mainHtml, settingsModalHtml);

  bindAppEvents(state, {
    onSelectSession: (id) => controller.selectSession(id),
    onNewSession: () => controller.handleNewSession(),
    onSendMessage: () => controller.handleSendMessage(),
    onSendNowQueued: (id) => controller.handleSendNowQueued(id),
    onEditQueued: (id) => controller.handleEditQueued(id),
    onDeleteQueued: (id) => controller.handleDeleteQueued(id),
    onToggleQueuedCollapse: () => controller.handleToggleQueuedCollapse(),
    onBuildPlan: (path, title) => controller.handleBuildPlan(path, title),
    onStopSession: () => controller.handleStopSession(),
    onResolveApproval: (cmdId, allowed) => controller.handleResolveApproval(cmdId, allowed),
    onSelectModel: (modelId) => controller.handleSelectModel(modelId),
    onSelectPlan: (name) => controller.selectPlan(name),
    onLoginSuccess: async () => {},
    onLogout: () => controller.handleLogout(),
    onToggleSyncMode: () => controller.toggleSyncMode(),
    onSetSyncMode: (mode) => controller.setSyncMode(mode),
    onToggleAutoFallback: (enabled) => controller.toggleAutoFallback(enabled),
    onSwitchConnection: async (url) => { await controller.handleSwitchConnection(url); },
    onRender: render,
  });

  restoreScrollState(focusSnapshot, state.activeTab);
  restoreFocusState(focusSnapshot);
  if (mainUpdated) {
    hydrateAllDiagrams(app);
  }
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void controller.init();
  });
} else {
  void controller.init();
}
