import { escapeHtml } from './markdown';

export interface ShellApprovalCardOptions {
  commandId: string;
  command: string;
  allowed?: boolean;
}

export function renderShellApprovalCard(opts: ShellApprovalCardOptions): string {
  const isDecided = typeof opts.allowed === 'boolean';
  const commandId = escapeHtml(opts.commandId);
  const command = escapeHtml(opts.command);

  let actionsHtml = '';
  if (!isDecided) {
    actionsHtml = `
      <div class="shell-approval-actions">
        <button type="button" class="shell-btn shell-btn--allow" data-command-id="${commandId}" data-decision="allow">Allow</button>
        <button type="button" class="shell-btn shell-btn--reject" data-command-id="${commandId}" data-decision="reject">Reject</button>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="shell-approval-actions">
        <span class="shell-decision ${opts.allowed ? 'is-allowed' : 'is-rejected'}">
          ${opts.allowed ? '✓ Allowed' : '✗ Rejected'}
        </span>
      </div>
    `;
  }

  return `
    <div class="activity-toggle activity-toggle--shell activity-toggle--live shell-approval-card expanded" data-command-id="${commandId}">
      <button type="button" class="activity-toggle-header">
        <div class="activity-toggle-left">
          <span class="tool-prompt-icon">&gt;_</span>
          <span class="activity-toggle-label">Execute command with approval</span>
        </div>
        <div class="activity-toggle-right">
          <span class="activity-toggle-chevron">›</span>
        </div>
      </button>
      <div class="activity-toggle-body">
        <pre class="activity-toggle-output"><code>${command}</code></pre>
        ${actionsHtml}
      </div>
    </div>
  `;
}
