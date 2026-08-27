export type SidebarViewMode = 'dashboard' | 'summary';

export function resolveSidebarViewMode(hasOpenPanels: boolean): SidebarViewMode {
  return hasOpenPanels ? 'summary' : 'dashboard';
}
