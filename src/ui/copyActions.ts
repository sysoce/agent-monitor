export const COPY_ICON_SVG =
  '<svg class="copy-btn-icon copy-btn-icon--copy" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
  '<rect x="5.5" y="1.5" width="9" height="11" rx="1.25" stroke="currentColor" stroke-width="1.25"/>' +
  '<rect x="1.5" y="4.5" width="9" height="11" rx="1.25" stroke="currentColor" stroke-width="1.25"/>' +
  '</svg>';

export const COPY_CHECK_ICON_SVG =
  '<svg class="copy-btn-icon copy-btn-icon--check" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
  '<path d="M13.5 4.5L6.5 11.5L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

export interface MessageCopyOptions {
  title?: string;
  user?: boolean;
  copyText?: string;
  time?: string | number | Date;
}

export function formatMessageTime(time?: string | number | Date): string {
  if (time === undefined || time === null || time === '' || (typeof time === 'number' && isNaN(time))) {
    return '';
  }
  if (typeof time === 'string') {
    const trimmed = time.trim();
    if (/^\d{1,2}:\d{2}(\s*(?:AM|PM|am|pm))?$/.test(trimmed)) {
      return trimmed;
    }
  }
  const date = new Date(time);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderMessageCopyActionsHtml(opts: MessageCopyOptions = {}): string {
  const isUser = Boolean(opts.user);
  const title = opts.title || (isUser ? 'Copy Message' : 'Copy Answer');
  const dataAttr = opts.copyText ? ` data-copy-text="${escapeAttr(opts.copyText)}"` : '';
  const timeFormatted = formatMessageTime(opts.time);
  const timeHtml = timeFormatted ? `<span class="msg-time">${escapeAttr(timeFormatted)}</span>` : '';
  const btnHtml = `<button type="button" class="copy-btn copy-btn--compact"${dataAttr} title="${title}" aria-label="${title}">${COPY_ICON_SVG}</button>`;
  const innerHtml = isUser ? `${timeHtml}${btnHtml}` : `${btnHtml}${timeHtml}`;
  return `<div class="msg-copy-actions${isUser ? ' msg-copy-actions--user' : ''}">${innerHtml}</div>`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

export function flashCopyButton(btn: HTMLElement): void {
  const origTitle = btn.getAttribute?.('aria-label') || btn.title || 'Copy';
  btn.classList?.add?.('copied');
  btn.classList?.add?.('copy-btn--done');
  btn.innerHTML = COPY_CHECK_ICON_SVG;
  btn.title = 'Copied';
  btn.setAttribute?.('aria-label', 'Copied');
  setTimeout(() => {
    btn.classList?.remove?.('copied');
    btn.classList?.remove?.('copy-btn--done');
    btn.innerHTML = COPY_ICON_SVG;
    btn.title = origTitle;
    btn.setAttribute?.('aria-label', origTitle);
  }, 1500);
}

export function createMessageCopyActions(
  getText: () => string,
  opts: MessageCopyOptions = {}
): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'msg-copy-actions' + (opts.user ? ' msg-copy-actions--user' : '');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-btn copy-btn--compact';
  const title = opts.title || (opts.user ? 'Copy Message' : 'Copy Answer');
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.innerHTML = COPY_ICON_SVG;

  btn.addEventListener('click', async (e: any) => {
    e.stopPropagation?.();
    const text = getText();
    await copyTextToClipboard(text);
    flashCopyButton(btn);
  });

  actions.appendChild(btn);
  return actions;
}
