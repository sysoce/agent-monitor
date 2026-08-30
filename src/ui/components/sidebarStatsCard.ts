import type { AppState } from '../types';
import { calculateDashboardStats, renderSidebarStats } from '../sidebar/sidebarStatsRender';

export { calculateDashboardStats, renderSidebarStats };

export function renderMonitorSidebarStats(state: AppState): string {
  const stats = calculateDashboardStats(state);
  return renderSidebarStats(stats, state.activeFilterTab || 'all');
}
