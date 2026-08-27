const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

export function isImageAttachment(name: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/')) return true;
  return IMAGE_EXT_RE.test(name || '');
}

export function resolveImageMimeType(fileNameOrExt: string): string {
  const lower = (fileNameOrExt || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

export function formatImageDataUrl(content: string, fileName = ''): string {
  const trimmed = (content || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  const mime = resolveImageMimeType(fileName);
  return `data:${mime};base64,${trimmed}`;
}
