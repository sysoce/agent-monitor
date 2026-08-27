import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderSessionDetailView } from '../src/ui/components/sessionDetailView';
import type { SessionDetail } from '../src/server/types';
import { captureFocusState, restoreScrollState } from '../src/ui/domFocusPreserver';

test('renderSessionDetailView renders extension-style section headers and empty items', () => {
  const emptySession: SessionDetail = {
    id: 'sess-empty',
    title: 'Empty Session',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 2000,
    messages: [],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const html = renderSessionDetailView(emptySession, {
    subagents: true,
    filesChanged: true,
    artifacts: true,
    uploads: true,
    tasks: true,
  });

  // Section headers with badges and chevrons
  assert.match(html, /class="section-header"\s+data-section="subagents"/);
  assert.match(html, /class="section-title">Subagents<\/span>/);
  assert.match(html, /class="section-badge">0<\/span>/);

  assert.match(html, /class="section-header"\s+data-section="filesChanged"/);
  assert.match(html, /class="section-title">Files Changed<\/span>/);

  assert.match(html, /class="section-header"\s+data-section="artifacts"/);
  assert.match(html, /class="section-title">Artifacts<\/span>/);

  assert.match(html, /class="section-header"\s+data-section="uploads"/);
  assert.match(html, /class="section-title">Uploads<\/span>/);

  assert.match(html, /class="section-header"\s+data-section="tasks"/);
  assert.match(html, /class="section-title">Background Tasks<\/span>/);

  // Empty state items matching extension text and styling
  assert.match(html, /class="empty-item">No active subagents<\/div>/);
  assert.match(html, /class="empty-item">No files changed in this session<\/div>/);
  assert.match(html, /class="empty-item">No artifacts created yet<\/div>/);
  assert.match(html, /class="empty-item">No uploads or attachments<\/div>/);
  assert.match(html, /class="empty-item">No background tasks<\/div>/);
});

test('renderSessionDetailView renders file rows and stats when files exist', () => {
  const activeSession: SessionDetail = {
    id: 'sess-with-files',
    title: 'Active Session',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 2000,
    messages: [],
    filesChanged: [
      { path: 'src/monitor/ui/entry.ts', status: 'modified', additions: 12, deletions: 3 },
    ],
    artifacts: [{ name: 'plan.md', path: '.agent/plans/plan.md', type: 'plan' }],
    subagents: [{ id: 'sub-1', role: 'Tester', status: 'completed', summary: 'All tests pass' }],
  };

  const html = renderSessionDetailView(activeSession, {
    subagents: true,
    filesChanged: true,
    artifacts: true,
    uploads: true,
    tasks: true,
  });

  assert.match(html, /class="file-row"/);
  assert.match(html, /class="file-name">entry\.ts<\/span>/);
  assert.match(html, /diff-stat--add">\+12<\/span>/);
  assert.match(html, /diff-stat--del">-3<\/span>/);
  assert.match(html, /class="artifact-row"/);
  assert.match(html, /class="row-text artifact-name">plan\.md<\/span>/);
});

test('captureFocusState and restoreScrollState preserves sidebar scroll across re-renders', () => {
  let sidebarScrollVal = 180;
  const mockSidebar = {
    className: 'sidebar-view',
    get scrollTop() { return sidebarScrollVal; },
    set scrollTop(v: number) { sidebarScrollVal = v; },
  };

  (globalThis as any).document = {
    activeElement: null,
    querySelector: (sel: string) => {
      if (sel === '.sidebar-view') return mockSidebar;
      return null;
    },
    getElementById: () => null,
  };

  const snapshot = captureFocusState();
  assert.equal(snapshot.sidebarScrollTop, 180);

  // Simulate re-render resetting scroll to 0
  sidebarScrollVal = 0;
  assert.equal(mockSidebar.scrollTop, 0);

  // Restore scroll
  restoreScrollState(snapshot, 'sidebar');
  assert.equal(mockSidebar.scrollTop, 180);
});
