import { type ListKind, type ListItem, type BlockToken } from './tokenizeTypes';
import {
  FENCE_RE,
  HEADING_RE,
  HR_RE,
  QUOTE_RE,
  BULLET_RE,
  ORDERED_RE,
  TABLE_DIVIDER_RE,
  LONE_BOLD_RE,
  splitRow,
  alignments,
} from './tokenizePatterns';
import { readList } from './tokenizeList';
import { readCodeFence } from './tokenizeCodeFence';

export { type ListKind, type ListItem, type BlockToken, readList, readCodeFence };

export function tokenizeBlocks(source: string): BlockToken[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const tokens: BlockToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(FENCE_RE);
    if (fence) {
      const { token, next } = readCodeFence(lines, i, fence);
      tokens.push(token);
      i = next;
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      tokens.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (HR_RE.test(line)) {
      tokens.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        body.push(lines[i].match(QUOTE_RE)![1]);
        i += 1;
      }
      tokens.push({ type: 'quote', text: body.join('\n').trim() });
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_DIVIDER_RE.test(lines[i + 1])) {
      const header = splitRow(line);
      const align = alignments(lines[i + 1]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      tokens.push({ type: 'table', header, align, rows });
      continue;
    }

    if (BULLET_RE.test(line) || ORDERED_RE.test(line)) {
      const { token, next } = readList(lines, i);
      tokens.push(token);
      i = next;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      const current = lines[i];
      if (
        FENCE_RE.test(current) ||
        HEADING_RE.test(current) ||
        HR_RE.test(current) ||
        QUOTE_RE.test(current) ||
        BULLET_RE.test(current) ||
        ORDERED_RE.test(current)
      ) {
        break;
      }
      if (LONE_BOLD_RE.test(current)) {
        if (paragraph.length > 0) break;
        paragraph.push(current.trim());
        i += 1;
        break;
      }
      paragraph.push(current.trim());
      i += 1;
    }
    if (paragraph.length) {
      tokens.push({ type: 'paragraph', text: paragraph.join('\n') });
    }
  }

  return collapseRepeatedBlocks(tokens);
}

export function collapseRepeatedBlocks(tokens: BlockToken[]): BlockToken[] {
  const out: BlockToken[] = [];
  for (const token of tokens) {
    const prev = out[out.length - 1];
    if (
      prev?.type === 'paragraph' &&
      token.type === 'paragraph' &&
      normalizeParagraphText(prev.text) === normalizeParagraphText(token.text)
    ) {
      continue;
    }
    out.push(token);
  }
  return out;
}

function normalizeParagraphText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
