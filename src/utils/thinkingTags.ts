const THINKING_OPEN = '<redacted_thinking>';
const THINKING_CLOSE = '</redacted_thinking>';
const CLOSE_TAGS = [
  THINKING_CLOSE, '</think>', '</Thought>', '</thought>', '</thinking>', '</Thinking>',
  '</reasoning>', '</Reasoning>', '<|end of thinking|>', '<|end_of_thought|>', '<|end_of_thinking|>'
] as const;
const OPEN_TAGS = [
  THINKING_OPEN, '<think>', '<Thought>', '<thought>', '<thinking>', '<Thinking>',
  '<reasoning>', '<Reasoning>', '<|begin of thinking|>', '<|begin_of_thought|>', '<|begin_of_thinking|>'
] as const;

function escapeRe(v: string): string { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const REDACTED_BLOCK_RE = new RegExp(`${escapeRe(THINKING_OPEN)}[\\s\\S]*?${escapeRe(THINKING_CLOSE)}`, 'gi');
const REDACTED_TAIL_RE = new RegExp(`${escapeRe(THINKING_OPEN)}[\\s\\S]*$`, 'i');
const WRAPPER_BLOCK_RE = /<\s*(?:Thought|think|thinking|reasoning)\s*>[\s\S]*?<\s*\/\s*(?:Thought|think|thinking|reasoning)\s*>/gi;
const WRAPPER_TAIL_RE = /<\s*(?:Thought|think|thinking|reasoning)\s*>[\s\S]*$/i;
const ANY_WRAPPER_TAG_RE = /<\/?\s*(?:Thought|think|thinking|reasoning|redacted_thinking)\s*>/gi;
const PARTIAL_TAG_MARKERS = [...CLOSE_TAGS, ...OPEN_TAGS];

function findPartialTagSuffix(text: string): string {
  for (const marker of PARTIAL_TAG_MARKERS) {
    for (let len = marker.length - 1; len >= 1; len -= 1) {
      if (text.endsWith(marker.slice(0, len))) return marker.slice(0, len);
    }
  }
  return '';
}

function findClose(text: string, fromEnd: boolean): { index: number; length: number } | null {
  const lower = text.toLowerCase();
  let best: { index: number; length: number } | null = null;
  for (const close of CLOSE_TAGS) {
    const idx = fromEnd ? lower.lastIndexOf(close.toLowerCase()) : lower.indexOf(close.toLowerCase());
    if (idx < 0) continue;
    if (!best || (fromEnd ? idx >= best.index : idx < best.index)) {
      best = { index: idx, length: close.length };
    }
  }
  return best;
}

export function stripThinkingDisplayTags(text: string): string {
  return text ? text.replace(ANY_WRAPPER_TAG_RE, '') : '';
}

export function stripRedactedThinkingTags(text: string): string {
  if (!text) return '';
  let res = text.replace(REDACTED_BLOCK_RE, '').replace(REDACTED_TAIL_RE, '').replace(WRAPPER_BLOCK_RE, '').replace(WRAPPER_TAIL_RE, '');
  if (/^\s*<\/?\s*(?:Thought|think|thinking|reasoning|redacted_thinking)\s*>\s*/i.test(res)) {
    res = res.replace(/^\s*<\/?\s*(?:Thought|think|thinking|reasoning|redacted_thinking)\s*>\s*/i, '');
  }
  return res.replace(ANY_WRAPPER_TAG_RE, '');
}

export function stripInlineThinkingTags(text: string): string {
  return !text ? '' : stripRedactedThinkingTags(text);
}

export function truncateThinkingAtCloseTag(text: string): string {
  if (!text) return '';
  const cut = findClose(text, false);
  if (!cut) return stripThinkingDisplayTags(text);
  const before = text.slice(0, cut.index).trim();
  return before ? stripThinkingDisplayTags(before) : truncateThinkingAtCloseTag(text.slice(cut.index + cut.length)).trimStart();
}

export function extractAnswerAfterThinkingTags(text: string): string {
  if (!text) return '';
  const cut = findClose(text, true);
  return stripRedactedThinkingTags(cut ? text.slice(cut.index + cut.length) : text).trimStart();
}

export function extractThinkingBlocks(text: string): { thinking: string; cleanText: string } {
  const m = text.match(/<\s*(?:thought|think|thinking|reasoning|redacted_thinking)\s*>([\s\S]*?)<\s*\/\s*(?:thought|think|thinking|reasoning|redacted_thinking)\s*>/i);
  return { thinking: m ? m[1].trim() : '', cleanText: stripRedactedThinkingTags(text).trim() };
}

export class ThinkingStreamFilter {
  private pending = '';
  private closed = false;

  push(chunk: string): string {
    if (this.closed || !chunk) return '';
    let s = this.pending + chunk;
    this.pending = '';
    const cut = findClose(s, false);
    if (cut) {
      this.closed = true;
      s = s.slice(0, cut.index);
    } else {
      const tail = findPartialTagSuffix(s);
      if (tail) {
        this.pending = tail;
        s = s.slice(0, -tail.length);
      }
    }
    return stripThinkingDisplayTags(s);
  }
}

export class AnswerStreamFilter {
  private pending = '';
  private hold = '';
  private afterClose = false;

  push(chunk: string): string {
    if (!chunk) return '';
    let s = this.pending + chunk;
    this.pending = '';
    if (!this.afterClose) {
      const cut = findClose(s, false);
      if (cut) {
        this.afterClose = true;
        this.hold = '';
        s = s.slice(cut.index + cut.length);
      } else {
        const tail = findPartialTagSuffix(s);
        if (tail) {
          this.pending = tail;
          s = s.slice(0, -tail.length);
        }
        this.hold += s;
        return '';
      }
    }
    const tail = findPartialTagSuffix(s);
    if (tail) {
      this.pending = tail;
      s = s.slice(0, -tail.length);
    }
    const out = stripRedactedThinkingTags(s);
    return out.trim() ? out : '';
  }

  flush(): string {
    if (this.afterClose) {
      const tail = this.pending;
      this.pending = '';
      return stripRedactedThinkingTags(tail);
    }
    const plain = stripRedactedThinkingTags(this.hold + this.pending);
    this.hold = '';
    this.pending = '';
    return plain;
  }
}
