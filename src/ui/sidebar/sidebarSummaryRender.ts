import { ICONS } from './sidebarDom';

export function renderSectionHeader(
  title: string,
  count: number,
  isExpanded: boolean,
  sectionKey: string,
  actionIcon?: string
): string {
  return `
    <div class="section-header" data-section="${sectionKey}">
      <span class="section-title">${title}</span>
      <span class="section-badge">${count}</span>
      <span class="chevron">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
      ${actionIcon ? `<span class="section-action">${actionIcon}</span>` : ''}
    </div>
  `;
}
