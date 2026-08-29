import type { BlockToken } from './tokenizeTypes';
import { isProseResumptionLine } from './tokenizePatterns';

export function readCodeFence(
  lines: string[],
  start: number,
  fenceMatch: RegExpMatchArray
): { token: BlockToken; next: number } {
  const marker = fenceMatch[2][0];
  const width = fenceMatch[2].length;
  const info = fenceMatch[3].trim();
  const body: string[] = [];
  let closed = false;
  let i = start + 1;

  while (i < lines.length) {
    const candidate = lines[i];
    const closing = candidate.match(/^\s*(`{3,}|~{3,})\s*$/);
    if (closing && closing[1][0] === marker && closing[1].length >= width) {
      closed = true;
      i += 1;
      break;
    }
    if (body.length > 0 && !body[body.length - 1].trim() && isProseResumptionLine(candidate)) {
      body.pop();
      closed = true;
      break;
    }
    body.push(candidate);
    i += 1;
  }

  const [lang, ...rest] = info.split(/\s+/);
  return {
    token: {
      type: 'code',
      lang: lang ?? '',
      meta: rest.join(' ') || undefined,
      code: body.join('\n'),
      closed,
    },
    next: i,
  };
}
