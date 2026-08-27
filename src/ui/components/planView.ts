import type { AppState } from '../types';
import { escapeHtml, renderMarkdownDocument } from './markdown';

export function renderPlanView(state: AppState): string {
  const plans = state.plans || [];
  const currentPlan = state.activePlan || (plans.length > 0 ? (plans.find((p) => p.name === state.activePlanName && p.content) as any) || (plans[0]?.content ? (plans[0] as any) : undefined) : undefined);
  const sessionTitle = state.activeSession?.title ? ` for "${escapeHtml(state.activeSession.title)}"` : '';

  return `
    <div class="plan-view-container">
      <div class="plan-content-scroll">
        ${
          !currentPlan
            ? `
              <div class="empty-state plan-empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">No plans in this session</div>
                <div class="empty-hint">Plans generated or referenced${sessionTitle} will show up here.</div>
              </div>
            `
            : `
              <div class="plan-card-view">
                <div class="plan-meta-header">
                  <div class="plan-path">📄 ${escapeHtml(currentPlan.path)}</div>
                  <button type="button" class="plan-build-btn" data-plan-path="${escapeHtml(currentPlan.path)}" data-plan-title="${escapeHtml(currentPlan.title || currentPlan.name)}">⚡ Build with Agent</button>
                </div>
                <div class="plan-body">
                  ${renderMarkdownDocument(currentPlan.content)}
                </div>
              </div>
            `
        }
      </div>
    </div>
  `;
}
