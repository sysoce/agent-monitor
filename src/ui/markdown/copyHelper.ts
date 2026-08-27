export function copyCodeToClipboard(text: string, btn?: HTMLElement | null): void {
  const showFeedback = () => {
    if (btn) {
      const origText = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = origText || 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    }
  };

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    navigator.clipboard
      .writeText(text)
      .then(showFeedback)
      .catch(() => {
        fallbackCopyText(text, showFeedback);
      });
  } else {
    fallbackCopyText(text, showFeedback);
  }
}

function fallbackCopyText(text: string, onSuccess?: () => void): void {
  if (typeof document === 'undefined') return;
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
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (successful) onSuccess?.();
  } catch (_e) {}
}
