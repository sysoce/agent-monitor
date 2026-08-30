import type { AttachmentItem } from '../../types';
import { isImageAttachment, formatImageDataUrl } from '../../utils/imageDetect';
import { escapeHtml } from './markdown';

function getAttachmentIcon(type: string): string {
  switch (type) {
    case 'image':
      return '🖼️';
    case 'folder':
    case 'directory':
      return '📁';
    case 'git':
      return '🌿';
    case 'problems':
      return '⚠️';
    default:
      return '📄';
  }
}

function resolveImageSrc(att: AttachmentItem): string {
  if (att.content) {
    return formatImageDataUrl(att.content, att.label || att.path || att.uri || '');
  }
  const uri = att.uri || '';
  if (
    uri.startsWith('data:') ||
    uri.startsWith('http:') ||
    uri.startsWith('https:') ||
    uri.startsWith('blob:') ||
    uri.startsWith('/api/')
  ) {
    return uri;
  }
  if (att.path) {
    return `/api/files?path=${encodeURIComponent(att.path)}`;
  }
  return '';
}

export function renderAttachmentPill(att: AttachmentItem, showRemove = true): string {
  const label = att.label || att.path || 'attachment';
  const isImage = att.type === 'image' || isImageAttachment(label);

  if (isImage) {
    const src = resolveImageSrc(att);
    const previewHtml = src
      ? `<img class="attachment-image-preview" src="${escapeHtml(src)}" alt="${escapeHtml(label)}" loading="lazy" />`
      : `<span class="attachment-image-fallback-icon">🖼️</span>`;

    const removeBtnHtml = showRemove
      ? `<button type="button" class="attachment-image-remove" data-att-id="${escapeHtml(att.id || '')}" title="Remove attachment" aria-label="Remove attachment">✕</button>`
      : '';

    return `
      <span class="attachment-pill attachment-image-thumb" data-att-id="${escapeHtml(att.id || '')}">
        <span class="attachment-image-tooltip" role="tooltip">${escapeHtml(label)}</span>
        <span class="attachment-image-preview-wrapper">${previewHtml}</span>
        ${removeBtnHtml}
      </span>
    `;
  }

  const icon = getAttachmentIcon(att.type);
  const removeBtnHtml = showRemove
    ? `<button type="button" class="attachment-pill-remove" data-att-id="${escapeHtml(att.id || '')}" title="Remove attachment">✕</button>`
    : '';

  return `
    <span class="attachment-pill" data-att-id="${escapeHtml(att.id || '')}">
      <span class="attachment-pill-icon">${icon}</span>
      <span class="attachment-pill-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      ${removeBtnHtml}
    </span>
  `;
}

