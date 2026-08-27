export function cleanPath(p: string): string {
  if (!p) return '';
  return p
    .replace(/^[\\/]+/, '')
    .replace(/^(?:Users\/[^/]+\/Work\/[^/]+\/[^/]+\/|workspace\/|root\/)/, '')
    .replace(/^\.\//, '');
}

export function truncateString(str: string, maxLen = 60): string {
  const singleLine = str.replace(/[\r\n]+/g, ' ').trim();
  return singleLine.length > maxLen ? singleLine.slice(0, maxLen - 1) + '…' : singleLine;
}

export function extractCommandTags(cmd: string): string[] {
  if (!cmd || typeof cmd !== 'string') return [];
  const tokens = cmd.split(/[|&;]+/).map((s) => s.trim()).filter(Boolean);
  const tags: string[] = [];
  for (const part of tokens) {
    const firstWord = part.split(/\s+/)[0]?.replace(/^[^a-zA-Z0-9_-]+/, '');
    if (firstWord && !tags.includes(firstWord) && firstWord.length < 15) {
      tags.push(firstWord);
    }
  }
  return tags;
}

export function formatTerminalOutput(container: HTMLElement, output: string): void {
  const lines = output.split('\n');
  const docFrag = document.createDocumentFragment();
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineEl = document.createElement('div');
    lineEl.className = 'terminal-line';

    const diffStatMatch = line.match(/^(\s*.+?\s+\|\s*\d+\s*)([+-]+)$/);
    if (diffStatMatch) {
      const [, prefix, signs] = diffStatMatch;
      lineEl.appendChild(document.createTextNode(prefix));
      for (const char of signs) {
        const signEl = document.createElement('span');
        signEl.className = char === '+' ? 'term-diff-add' : 'term-diff-del';
        signEl.textContent = char;
        lineEl.appendChild(signEl);
      }
    } else {
      lineEl.textContent = line || ' ';
    }
    docFrag.appendChild(lineEl);
  }
  container.appendChild(docFrag);
}
