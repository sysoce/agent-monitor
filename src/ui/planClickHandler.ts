import type { AppState } from './types';
import type { EventHandlerCallbacks } from './eventHandlers';

export function handlePlanClick(target: HTMLElement, state: AppState, callbacks: EventHandlerCallbacks): boolean {
  const buildBtn = target.closest<HTMLElement>('.plan-build-btn');
  if (buildBtn) {
    const planPath = buildBtn.getAttribute('data-plan-path') || '';
    const planTitle = buildBtn.getAttribute('data-plan-title') || buildBtn.closest('.plan-card')?.querySelector('.plan-card-title')?.textContent?.trim() || '';
    if (callbacks.onBuildPlan) void callbacks.onBuildPlan(planPath, planTitle);
    else {
      state.composerMode = 'agent';
      state.activePlan = undefined;
      state.activePlanName = undefined;
      state.activeTab = 'chat';
      callbacks.onRender();
    }
    return true;
  }

  const planLink = target.closest<HTMLElement>('.plan-view-btn, .plan-link-item, .md-plan-link, .session-plan-chip, [data-plan-path], [data-open-artifact]');
  if (planLink) {
    const planPath = planLink.getAttribute('data-plan-path') || planLink.getAttribute('data-open-artifact') || '';
    if (!planPath) return false;
    const cleanPath = planPath.replace(/^📋\s*/, '').replace(/^file:\/\//, '').trim();
    const name = cleanPath.split('/').pop() || cleanPath;
    state.activePlanName = name;
    state.activeTab = 'chat';
    void callbacks.onSelectPlan(name);
    return true;
  }
  return false;
}
