import type { AppState } from './types';
import { loginWithPassword } from './apiClient';
import { parseUrlConfig, applyConfigToStorage } from './urlConfigLoader';
import type { EventHandlerCallbacks } from './eventHandlers';

function applyParsedConfig(val: string): boolean {
  const parsed = parseUrlConfig(val);
  if (parsed) {
    if (parsed.gistId) {
      const gEl = document.getElementById('login-gist-id') as HTMLInputElement | null;
      if (gEl) gEl.value = parsed.gistId;
    }
    if (parsed.token) {
      const tEl = document.getElementById('login-gist-token') as HTMLInputElement | null;
      if (tEl) tEl.value = parsed.token;
    }
    if (parsed.password) {
      const pEl = document.getElementById('login-password-input') as HTMLInputElement | null;
      if (pEl) pEl.value = parsed.password;
    }
    applyConfigToStorage(parsed);
    return true;
  }
  return false;
}

export function bindLoginEvents(state: AppState, callbacks: EventHandlerCallbacks): void {
  const quickInput = document.getElementById('login-quick-setup') as HTMLInputElement | null;
  quickInput?.addEventListener('input', () => {
    applyParsedConfig(quickInput.value.trim());
  });

  quickInput?.addEventListener('paste', () => {
    setTimeout(() => {
      if (quickInput) applyParsedConfig(quickInput.value.trim());
    }, 50);
  });

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (quickInput?.value.trim()) {
      applyParsedConfig(quickInput.value.trim());
    }

    const gId = (document.getElementById('login-gist-id') as HTMLInputElement | null)?.value.trim();
    const gTok = (document.getElementById('login-gist-token') as HTMLInputElement | null)?.value.trim();
    const pwdInput = document.getElementById('login-password-input') as HTMLInputElement | null;
    const pwd = pwdInput?.value.trim();

    if (gId && gTok) {
      applyConfigToStorage({ gistId: gId, token: gTok, password: pwd });
    }

    if (!pwd) {
      state.authError = 'Please enter your vault password or PIN.';
      callbacks.onRender();
      return;
    }

    const ok = await loginWithPassword(pwd);
    if (ok) {
      state.isAuthenticated = true;
      state.authError = undefined;
      await callbacks.onLoginSuccess();
    } else {
      const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
      const hasGist = typeof localStorage !== 'undefined' && !!localStorage.getItem('agent_gist_sync');
      if (isFile || !hasGist) {
        state.authError = 'Local file mode requires Gist settings. Paste your setup code or enter Gist ID & token below.';
        const details = document.querySelector('.login-gist-details') as HTMLDetailsElement | null;
        if (details) details.open = true;
      } else {
        state.authError = 'Invalid password or connection failed.';
      }
      callbacks.onRender();
    }
  });
}
