import type { SessionDetail } from '../../server/types';
import { renderSectionHeader } from '../sidebar/sidebarSummaryRender';
import {
  renderArtifacts,
  renderFilesChanged,
  renderSubagents,
  renderTasks,
  renderUploads,
} from '../sidebar/sidebarSectionRenderers';
import { ICONS } from '../sidebar/sidebarDom';
import type {
  SidebarArtifact,
  SidebarBackgroundTask,
  SidebarChangedFile,
  SidebarSubagent,
  SidebarUpload,
} from '../sidebar/types';

export function renderSessionDetailView(
  active: SessionDetail,
  expandedSections?: Record<string, boolean>,
  showAllItems?: Record<string, boolean>
): string {
  const isSubagentsExpanded = expandedSections?.subagents ?? true;
  const isFilesExpanded = expandedSections?.filesChanged ?? true;
  const isArtifactsExpanded = expandedSections?.artifacts ?? true;
  const isUploadsExpanded = expandedSections?.uploads ?? true;
  const isTasksExpanded = expandedSections?.tasks ?? true;

  const showAllFiles = showAllItems?.filesChanged ?? false;
  const showAllArtifacts = showAllItems?.artifacts ?? false;

  const files: SidebarChangedFile[] = (active.filesChanged || []).map((f) => {
    const parts = f.path.split('/');
    const file = parts.pop() || f.path;
    const dir = parts.join('/');
    const ext = file.includes('.') ? file.split('.').pop() || '' : '';
    return {
      file,
      dir: dir || '.',
      ext,
      fullPath: f.path,
      status: f.status as any,
      additions: f.additions,
      deletions: f.deletions,
    };
  });

  const rawArtifacts = [...(active.artifacts || [])];
  if (active.plans) {
    for (const p of active.plans) {
      if (!rawArtifacts.some((a) => a.path === p.path)) {
        rawArtifacts.push({ name: p.title || p.name, path: p.path, type: 'plan' });
      }
    }
  }
  const artifacts: SidebarArtifact[] = rawArtifacts.map((a) => ({
    name: a.name,
    path: a.path,
    type: a.type as any,
  }));

  const subagents: SidebarSubagent[] = (active.subagents || []).map((s) => ({
    id: s.id,
    role: s.role,
    type: s.type,
    status: s.status || 'completed',
    summary: s.summary || s.prompt,
  }));

  const uploads: SidebarUpload[] = [];
  if (active.messages) {
    for (const m of active.messages) {
      if ((m as any).attachments) {
        for (const att of (m as any).attachments) {
          uploads.push({
            label: att.name || att.path || 'Attachment',
            path: att.path,
            type: att.type || 'image',
            timestamp: (m as any).timestamp,
          });
        }
      }
    }
  }

  const tasks: SidebarBackgroundTask[] = (active.backgroundTasks || []).map((t) => ({
    id: t.id,
    name: t.name,
    command: t.command,
    status: t.status,
  }));

  return `
    <div class="session-details-card">
      ${renderSectionHeader('Subagents', subagents.length, isSubagentsExpanded, 'subagents')}
      ${renderSubagents(subagents, isSubagentsExpanded)}

      ${renderSectionHeader('Files Changed', files.length, isFilesExpanded, 'filesChanged')}
      ${renderFilesChanged(files, isFilesExpanded, showAllFiles)}

      ${renderSectionHeader('Artifacts', artifacts.length, isArtifactsExpanded, 'artifacts')}
      ${renderArtifacts(artifacts, isArtifactsExpanded, showAllArtifacts)}

      ${renderSectionHeader('Uploads', uploads.length, isUploadsExpanded, 'uploads')}
      ${renderUploads(uploads, isUploadsExpanded)}

      ${renderSectionHeader('Background Tasks', tasks.length, isTasksExpanded, 'tasks', tasks.length > 0 ? ICONS.stopCircle : undefined)}
      ${renderTasks(tasks, isTasksExpanded)}
    </div>
  `;
}
