import type { BlockToken, ListKind, ListItem } from './tokenizeTypes';
import { BULLET_RE, ORDERED_RE, TASK_RE } from './tokenizePatterns';

export function readList(lines: string[], start: number): { token: BlockToken; next: number } {
  const first = lines[start];
  const ordered = ORDERED_RE.exec(first);
  const kind: ListKind = ordered ? 'ordered' : 'bullet';
  const startNumber = ordered ? Number(ordered[2]) : 1;
  const items: ListItem[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      // A blank line ends the list unless the next line continues the same list kind.
      const following = lines[i + 1];
      const continues = following && (kind === 'ordered' ? ORDERED_RE.test(following) : BULLET_RE.test(following));
      if (!continues) break;
      i += 1;
      continue;
    }

    const bullet = kind === 'bullet' ? BULLET_RE.exec(line) : null;
    const numbered = kind === 'ordered' ? ORDERED_RE.exec(line) : null;
    if (!bullet && !numbered) {
      // Indented continuation of the previous item.
      if (items.length && /^\s{2,}\S/.test(line)) {
        items[items.length - 1].text += `\n${line.trim()}`;
        i += 1;
        continue;
      }
      break;
    }

    const indent = (bullet ? bullet[1] : numbered![1]).replace(/\t/g, '  ').length;
    const rawText = bullet ? bullet[2] : numbered![3];
    const task = TASK_RE.exec(rawText);

    items.push({
      depth: Math.floor(indent / 2),
      text: task ? task[2] : rawText,
      checked: task ? task[1].toLowerCase() === 'x' : undefined,
    });
    i += 1;
  }

  return { token: { type: 'list', kind, start: startNumber, items }, next: i };
}
