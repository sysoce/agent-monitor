/**
 * Models often wrap section titles in **…** instead of using ## headings.
 * Classify lone-bold paragraphs to promote true section titles to md-bold-title.
 */
export type LoneBoldKind = 'status' | 'title' | 'body';

const STATUS_LABEL_RE = /^(Error|Warning|Note|Failed|Success|Info|Erro)$/i;

/** Soft cap: real section titles stay short; longer bold lines are emphasis. */
const TITLE_MAX_LENGTH = 80;

/**
 * Classify a paragraph whose only content is a single <strong>.
 * - status: **Error** / **Warning** / … (stay body-sized, error-bubble styling)
 * - title: short title-like line (promote toward ## size)
 * - body: bold prose — keep normal paragraph size
 */
export function classifyLoneBoldText(raw: string): LoneBoldKind {
  const text = String(raw || '').trim();
  if (!text) return 'body';
  if (STATUS_LABEL_RE.test(text)) return 'status';
  if (!looksLikeBoldTitle(text)) return 'body';
  return 'title';
}

function looksLikeBoldTitle(text: string): boolean {
  if (text.length > TITLE_MAX_LENGTH) return false;
  // Sentence terminators mark prose, not a section title.
  if (/[.!?]$/.test(text)) return false;
  if (/\.\s/.test(text)) return false;
  // "In summary: The system is excellent…" — long clause after a colon is prose.
  const colon = text.indexOf(':');
  if (colon >= 0 && text.length - colon - 1 > 40) return false;
  return true;
}
