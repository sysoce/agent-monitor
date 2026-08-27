export const dom = {
  get conversation(): HTMLElement { return document.getElementById('conversation')!; },
  get conversationEmpty(): HTMLElement { return document.getElementById('conversationEmpty')!; },
  get attachedTodos(): HTMLElement | null { return document.getElementById('attachedTodos'); },
  get attachedTodosInner(): HTMLElement | null { return document.getElementById('attachedTodosInner'); },
  get filesBar(): HTMLElement { return document.getElementById('filesBar')!; },
  get filesBarToggle(): HTMLElement { return document.getElementById('filesBarToggle')!; },
  get filesBarCount(): HTMLElement { return document.getElementById('filesBarCount')!; },
  get filesBarAdditions(): HTMLElement { return document.getElementById('filesBarAdditions')!; },
  get filesBarDeletions(): HTMLElement { return document.getElementById('filesBarDeletions')!; },
  get filesBarUndo(): HTMLElement { return document.getElementById('filesBarUndo')!; },
  get filesBarKeep(): HTMLElement { return document.getElementById('filesBarKeep')!; },
  get filesBarReview(): HTMLElement { return document.getElementById('filesBarReview')!; },
  get filesBarList(): HTMLElement { return document.getElementById('filesBarList')!; },
  get fileSuggest(): HTMLElement { return document.getElementById('fileSuggest')!; },
  get attachmentList(): HTMLElement { return document.getElementById('attachmentList')!; },
  get messageInput(): HTMLElement { return document.getElementById('messageInput')!; },
  get agentModeBtn(): HTMLElement { return document.getElementById('agentMode')!; },
  get agentModeLabel(): HTMLElement { return document.getElementById('agentModeLabel')!; },
  get agentModeMenu(): HTMLElement { return document.getElementById('agentModeMenu')!; },
  get modeMenuList(): HTMLElement { return document.getElementById('modeMenuList')!; },
  get modelModeBtn(): HTMLElement { return document.getElementById('modelMode')!; },
  get modelModeLabel(): HTMLElement { return document.getElementById('modelModeLabel')!; },
  get modelModeMenu(): HTMLElement { return document.getElementById('modelModeMenu')!; },
  get modelSearchInput(): HTMLInputElement | null { return document.getElementById('modelSearchInput') as HTMLInputElement | null; },
  get modelMenuList(): HTMLElement { return document.getElementById('modelMenuList')!; },
  get attachBtn(): HTMLElement { return document.getElementById('attachBtn')!; },
  get sendBtn(): HTMLElement { return document.getElementById('sendBtn')!; },
  get queuedMessages(): HTMLElement | null { return document.getElementById('queuedMessages'); },
  get queuedHeader(): HTMLElement | null { return document.getElementById('queuedHeader'); },
  get queuedCount(): HTMLElement | null { return document.getElementById('queuedCount'); },
  get queuedToggle(): HTMLElement | null { return document.getElementById('queuedToggle'); },
  get queuedList(): HTMLElement | null { return document.getElementById('queuedList'); },
  get backgroundTasks(): HTMLElement | null { return document.getElementById('backgroundTasks'); },
  get backgroundTasksInner(): HTMLElement | null { return document.getElementById('backgroundTasksInner'); },
  get metricsBar(): HTMLElement | null { return document.getElementById('metricsBar'); },
  get metricsBarFill(): HTMLElement | null { return document.getElementById('metricsBarFill'); },
  get metricsContext(): HTMLElement | null { return document.getElementById('metricsContext'); },
  get metricsOutput(): HTMLElement | null { return document.getElementById('metricsOutput'); },
  get metricsTps(): HTMLElement | null { return document.getElementById('metricsTps'); },
};


export function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
