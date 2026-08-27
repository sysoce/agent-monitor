export interface FocusSnapshot {
  activeElementId: string | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  value: string | null;
  scrollTop: number | null;
  chatScrollTop: number | null;
  isChatNearBottom: boolean;
  sidebarScrollTop: number | null;
  plansScrollTop: number | null;
}

export function captureFocusState(): FocusSnapshot {
  if (typeof document === 'undefined') {
    return {
      activeElementId: null,
      selectionStart: null,
      selectionEnd: null,
      value: null,
      scrollTop: null,
      chatScrollTop: null,
      isChatNearBottom: true,
      sidebarScrollTop: null,
      plansScrollTop: null,
    };
  }

  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  const activeId = active?.id || null;
  let selStart: number | null = null;
  let selEnd: number | null = null;
  let val: string | null = null;

  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    try {
      selStart = active.selectionStart;
      selEnd = active.selectionEnd;
      val = active.value;
    } catch {}
  }

  const chatContainer = typeof document.getElementById === 'function' ? document.getElementById('chat-messages-container') : null;
  const chatScrollTop = chatContainer ? chatContainer.scrollTop : null;
  const isChatNearBottom = chatContainer
    ? chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 60
    : true;

  const sidebarContainer = typeof document.querySelector === 'function' ? document.querySelector<HTMLElement>('.sidebar-view') : null;
  const sidebarScrollTop = sidebarContainer ? sidebarContainer.scrollTop : null;

  const plansContainer = typeof document.querySelector === 'function' ? document.querySelector<HTMLElement>('.plan-content-scroll, .chat-plan-scroll') : null;
  const plansScrollTop = plansContainer ? plansContainer.scrollTop : null;

  return {
    activeElementId: activeId,
    selectionStart: selStart,
    selectionEnd: selEnd,
    value: val,
    scrollTop: active?.scrollTop || null,
    chatScrollTop,
    isChatNearBottom,
    sidebarScrollTop,
    plansScrollTop,
  };
}

export function restoreFocusState(snapshot: FocusSnapshot): void {
  if (typeof document === 'undefined' || !snapshot.activeElementId || typeof document.getElementById !== 'function') return;

  const el = document.getElementById(snapshot.activeElementId) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;

  try {
    el.focus({ preventScroll: true });
    if (snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
      el.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
    if (snapshot.scrollTop !== null) {
      el.scrollTop = snapshot.scrollTop;
    }
  } catch {}
}

export function restoreChatScroll(snapshot: FocusSnapshot): void {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  const chatContainer = document.getElementById('chat-messages-container');
  if (!chatContainer) return;

  if (snapshot.isChatNearBottom || snapshot.chatScrollTop === null) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    chatContainer.scrollTop = snapshot.chatScrollTop;
  }
}

export function restoreScrollState(snapshot: FocusSnapshot, activeTab: string): void {
  if (typeof document === 'undefined') return;
  if (activeTab === 'chat') {
    restoreChatScroll(snapshot);
  } else if (activeTab === 'sidebar') {
    const sidebarContainer = typeof document.querySelector === 'function' ? document.querySelector<HTMLElement>('.sidebar-view') : null;
    if (sidebarContainer && snapshot.sidebarScrollTop !== null) {
      sidebarContainer.scrollTop = snapshot.sidebarScrollTop;
    }
  } else if (activeTab === 'plans') {
    const plansContainer = typeof document.querySelector === 'function' ? document.querySelector<HTMLElement>('.plan-content-scroll, .chat-plan-scroll') : null;
    if (plansContainer && snapshot.plansScrollTop !== null) {
      plansContainer.scrollTop = snapshot.plansScrollTop;
    }
  }
}
