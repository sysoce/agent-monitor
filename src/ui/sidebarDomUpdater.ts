import type { AppState } from './types';
import { renderSidebarView } from './components/sidebarView';
import { renderMonitorSidebarStats } from './components/sidebarStatsCard';
import { renderSessionDetailView } from './components/sessionDetailView';
import { renderSessionListHtml } from './sidebarSessionUtils';

export function updateSidebarDOM(state: AppState, container: HTMLElement): void {
  const sidebarEl = container.querySelector<HTMLElement>('.sidebar-view');
  if (!sidebarEl) {
    const nextHtml = renderSidebarView(state);
    container.innerHTML = nextHtml;
    if (container.dataset) container.dataset.renderedHtml = nextHtml;
    return;
  }

  const searchInput = sidebarEl.querySelector<HTMLInputElement>('#session-search');
  if (searchInput && typeof document !== 'undefined' && document.activeElement !== searchInput) {
    if (searchInput.value !== state.searchQuery) {
      searchInput.value = state.searchQuery;
    }
  }

  const searchBar = sidebarEl.querySelector<HTMLElement>('.search-bar');
  const clearBtn = sidebarEl.querySelector<HTMLElement>('#btn-clear-search');
  if (searchBar) {
    if (state.searchQuery && !clearBtn) {
      if (typeof searchBar.insertAdjacentHTML === 'function') {
        searchBar.insertAdjacentHTML('beforeend', '<button type="button" id="btn-clear-search" class="clear-btn">✕</button>');
      }
    } else if (!state.searchQuery && clearBtn) {
      clearBtn.remove();
    }
  }

  const statsEl =
    sidebarEl.querySelector<HTMLElement>('.sidebar-stats-widget') ||
    sidebarEl.querySelector<HTMLElement>('.monitor-stats-widget') ||
    sidebarEl.querySelector<HTMLElement>('.monitor-stats-container');
  const nextStatsHtml = renderMonitorSidebarStats(state);
  if (statsEl) {
    if (!statsEl.dataset || statsEl.dataset.renderedHtml !== nextStatsHtml) {
      statsEl.outerHTML = nextStatsHtml;
    }
  }

  const listEl = sidebarEl.querySelector<HTMLElement>('.session-list');
  if (listEl) {
    const nextListHtml = renderSessionListHtml(state);
    if (listEl.dataset.renderedHtml !== nextListHtml) {
      listEl.innerHTML = nextListHtml;
      listEl.dataset.renderedHtml = nextListHtml;
    }
  }

  const detailEl = sidebarEl.querySelector<HTMLElement>('.session-detail-view');
  if (state.activeSession) {
    const nextDetailHtml = renderSessionDetailView(state.activeSession, state.expandedSections, state.showAllItems);
    if (detailEl) {
      if (detailEl.dataset.renderedHtml !== nextDetailHtml) {
        detailEl.outerHTML = nextDetailHtml;
      }
    }
  } else if (detailEl) {
    detailEl.remove();
  }

  if (container.dataset) container.dataset.renderedHtml = renderSidebarView(state);
}
