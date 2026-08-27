export function updateViewportCssVariable(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  if (vh && document.documentElement?.style) {
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
  }

  if (window.scrollY !== 0 && typeof window.scrollTo === 'function') {
    window.scrollTo(0, 0);
  }
}

export function scrollChatToBottom(smooth = false): void {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const chatContainer = document.getElementById('chat-messages-container');
  if (!chatContainer) return;

  if (smooth && typeof chatContainer.scrollTo === 'function') {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
  } else {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

export function bindComposerKeyboardScroll(composer: HTMLElement): void {
  if (!composer || typeof composer.addEventListener !== 'function') return;

  const triggerScroll = () => {
    scrollChatToBottom(true);
    setTimeout(() => scrollChatToBottom(false), 100);
    setTimeout(() => scrollChatToBottom(false), 250);
    setTimeout(() => scrollChatToBottom(false), 400);
  };

  composer.addEventListener('focus', triggerScroll);
  composer.addEventListener('click', triggerScroll);
}

let isViewportInitialized = false;

export function initViewportManager(): void {
  if (isViewportInitialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  isViewportInitialized = true;

  updateViewportCssVariable();

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      updateViewportCssVariable();
      scrollChatToBottom(false);
    });

    window.visualViewport.addEventListener('scroll', () => {
      if (window.scrollY !== 0 && typeof window.scrollTo === 'function') {
        window.scrollTo(0, 0);
      }
    });
  }

  window.addEventListener('resize', updateViewportCssVariable);
  window.addEventListener('orientationchange', () => {
    setTimeout(updateViewportCssVariable, 100);
  });
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.id === 'composer-input') {
      setTimeout(() => scrollChatToBottom(false), 50);
      setTimeout(() => scrollChatToBottom(false), 200);
    }
  });
}
