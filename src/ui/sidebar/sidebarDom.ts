export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getFileBadgeInfo(ext: string): { label: string; bg: string; fg: string } {
  switch (ext.toLowerCase()) {
    case 'md':
    case 'markdown':
      return { label: 'M↓', bg: 'rgba(77, 170, 252, 0.2)', fg: '#4daafc' };
    case 'ts':
    case 'tsx':
      return { label: 'TS', bg: 'rgba(49, 120, 198, 0.25)', fg: '#54a3ff' };
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return { label: 'JS', bg: 'rgba(247, 223, 30, 0.2)', fg: '#f7df1e' };
    case 'py':
      return { label: 'PY', bg: 'rgba(53, 114, 165, 0.25)', fg: '#60b5ff' };
    case 'json':
      return { label: '{}', bg: 'rgba(255, 165, 0, 0.2)', fg: '#ffa500' };
    case 'css':
    case 'scss':
    case 'less':
      return { label: '#', bg: 'rgba(168, 85, 247, 0.2)', fg: '#c084fc' };
    case 'html':
      return { label: '<>', bg: 'rgba(227, 76, 38, 0.2)', fg: '#ff6e4a' };
    case 'rs':
      return { label: 'RS', bg: 'rgba(222, 90, 56, 0.2)', fg: '#de5a38' };
    case 'go':
      return { label: 'GO', bg: 'rgba(0, 173, 216, 0.2)', fg: '#00add8' };
    default:
      return { label: ext.toUpperCase().slice(0, 2) || '••', bg: 'rgba(255, 255, 255, 0.1)', fg: '#cccccc' };
  }
}

export function searchShortcutLabel(): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  return isMac ? '⌘K' : 'Ctrl+K';
}

export const ICONS = {
  search: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>`,
  paperPlane: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.244 6.636 10.07Zm6.928-8.2L2.559 6.082l4.338 2.76 6.667-6.972Z"/></svg>`,
  branch: `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><circle cx="4" cy="4" r="1.75"/><circle cx="12" cy="4" r="1.75"/><circle cx="8" cy="12" r="1.75"/><path d="M4 5.75v1.5A2.75 2.75 0 0 0 6.75 10h1.5M12 5.75v1.5A2.75 2.75 0 0 1 9.25 10H8" fill="none" stroke="currentColor" stroke-width="1.25"/></svg>`,
  plus: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>`,
  refresh: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>`,
  document: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1H4a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5V5.5L9 1z"/><polyline points="9 1 9 5.5 13.5 5.5"/></svg>`,
  code: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="5.5 4.5 2 8 5.5 11.5"/><polyline points="10.5 4.5 14 8 10.5 11.5"/></svg>`,
  taskSpinner: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 8a6 6 0 1 1-2.5-4.9"/></svg>`,
  checkCircle: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 8.2l1.8 1.8 3.5-3.8"/></svg>`,
  errorCircle: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>`,
  stopCircle: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="8" cy="8" r="6"/><rect x="5.5" y="5.5" width="5" height="5" rx="1" fill="currentColor"/></svg>`,
  image: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>`,
  chevronRight: `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>`,
  trash: `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`,
  copy: `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`,
  chat: `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/></svg>`,
  pin: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9.828 1.172a2 2 0 0 1 2.828 2.828l-1.414 1.414L10.5 7.5l2 2-1 1-3.5-1-3 3-1.5-1.5 3-3-1-3.5 1-1 2.086.743 1.414-1.414-2.828-2.828"/></svg>`,
  pinFilled: `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.283.282-.63.486-.854.607v3.872a.5.5 0 0 1-.146.354l-2 2A.5.5 0 0 1 8 9h-.5v6.5a.5.5 0 0 1-1 0V9H6a.5.5 0 0 1-.354-.146l-2-2A.5.5 0 0 1 3.5 6.5V2.586c-.224-.121-.571-.325-.854-.607C2.342 1.674 2 1.179 2 .5A.5.5 0 0 1 2.5 0h1.646z"/></svg>`,
  statsPulse: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="1 8 4 8 6 3 9 13 11 8 15 8"/></svg>`,
  artifactFile: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 2a1 1 0 0 1 1-1h5.5L13 4.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2z"/><polyline points="9 1 9 5 13 5"/></svg>`,
  filterAll: `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.293V13.5a.5.5 0 0 1-.724.447l-2-1A.5.5 0 0 1 7 12.5V8.293L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/></svg>`,
  terminal: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 5.5 7 8 4 10.5"/><line x1="8.5" y1="10.5" x2="12" y2="10.5"/></svg>`,
};
