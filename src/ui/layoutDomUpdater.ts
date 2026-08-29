import type { AppState } from './types';
import { renderNavHeader } from './components/navHeader';
import { renderComposerView } from './components/composerView';
import { updateComposerDOM } from './composerDomUpdater';
import { updateSettingsModalDOM, initModalSectionsCache } from './settingsModalDomUpdater';

export function updateLayoutDOM(
  app: HTMLElement,
  state: AppState,
  mainHtml: string,
  settingsModalHtml: string
): boolean {
  const existingLayout = app.querySelector('.app-layout');
  let mainUpdated = false;

  if (!existingLayout) {
    app.innerHTML = `
      <div class="app-layout">
        <div id="nav-container">${renderNavHeader(state)}</div>
        <main class="app-main">${mainHtml}</main>
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
  const newNavHtml = renderNavHeader(state);
  if (navContainer) {
    if (navContainer.dataset.renderedHtml !== newNavHtml) {
      navContainer.innerHTML = newNavHtml;
      navContainer.dataset.renderedHtml = newNavHtml;
    }
  } else {
    const navEl = existingLayout.querySelector<HTMLElement>('.app-header, .app-nav-header');
    if (navEl && navEl.dataset.renderedHtml !== newNavHtml) {
      navEl.outerHTML = newNavHtml;
      const newNav = existingLayout.querySelector<HTMLElement>('.app-header, .app-nav-header');
      if (newNav) newNav.dataset.renderedHtml = newNavHtml;
    }
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
  } else {
    const modalEl = existingLayout.querySelector<HTMLElement>('#settings-modal, #qr-modal');
    if (settingsModalHtml) {
      if (modalEl) {
        if (modalEl.dataset.renderedHtml !== settingsModalHtml) {
          updateSettingsModalDOM(state, modalEl);
          modalEl.dataset.renderedHtml = settingsModalHtml;
        }
      } else {
        existingLayout.insertAdjacentHTML('beforeend', settingsModalHtml);
        const newModal = existingLayout.querySelector<HTMLElement>('#settings-modal, #qr-modal');
        if (newModal) {
          newModal.dataset.renderedHtml = settingsModalHtml;
          initModalSectionsCache(newModal, state);
        }
      }
    } else if (modalEl) {
      modalEl.remove();
    }
  }

  return mainUpdated;
}
