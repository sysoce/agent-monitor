export const FENCE_RE = /^(\s*)(`{3,}|~{3,})\s*(.*)$/;
export const HEADING_RE = /^(#{1,6})\s+(.*)$/;
export const HR_RE = /^\s*(?:[-*_]\s*){3,}$/;
export const QUOTE_RE = /^\s*>\s?(.*)$/;
export const BULLET_RE = /^(\s*)[-*+]\s+(.*)$/;
export const ORDERED_RE = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
export const TASK_RE = /^\[([ xX])\]\s+(.*)$/;
export const TABLE_DIVIDER_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
export const LONE_BOLD_RE = /^\s*(\*\*|__)[^*_]+(\*\*|__)\s*$/;

export function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function alignments(divider: string): (string | null)[] {
  return splitRow(divider).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });
}

export const PROSE_STARTER_RE =
  /^(?:Actually|Wait|Okay|Ok|Alright|Hmm|Looking|Next|Now|So|Let's|Let|I'll|I've|I'm|I\s|We\s|The\s|This\s|That\s|Here\s|Therefore|However|Alternatively|First|Second|Third|Finally|Note|If\s|In\s|When\s|As\s|Since\s|Because\s|To\s|For\s|You\s|It\s|There\s|Based\s|According\s|Overall)\b/i;

export function isCodeLike(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\s{2,}\S/.test(line) || /^\t\S/.test(line)) return true;
  if (
    /^(?:import|export|from|const|let|var|function|return|def|class|public|private|protected|if|else|for|while|switch|case|try|catch|async|await|yield|type|interface|struct|enum|namespace|package|using)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (/^#(?:include|define|ifdef|ifndef|pragma|if|else|endif)\b/i.test(trimmed)) return true;
  if (/^(?:\/\/|\/\*|\*|<!--|#\s*[a-z0-9_]+)/i.test(trimmed)) return true;
  if (
    /^(?:cat|grep|ls|cd|echo|git|npm|yarn|pnpm|docker|curl|wget|python|node|pytest|make|cargo|go|find|sed|awk|rm|mkdir|cp|mv|chmod|sudo)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (/[;{}()\[\]=><+|&]$/.test(trimmed)) return true;
  return false;
}

export function isProseResumptionLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isCodeLike(trimmed)) return false;

  if (/^\s*#{1,6}\s+\S/.test(line)) return true;
  if (/^\s*>\s+\S/.test(line)) return true;
  if (/^\s*[-*+]\s+[A-Za-z]/.test(line)) return true;
  if (/^\s*\d+[.)]\s+[A-Za-z]/.test(line)) return true;

  if (/^["'][A-Z]/.test(trimmed)) return true;
  if (PROSE_STARTER_RE.test(trimmed)) return true;

  if (
    /^[A-Z][a-zA-Z0-9\s`'"',.\(\)]+[.?!"]$/.test(trimmed) &&
    trimmed.includes(' ')
  ) {
    return true;
  }

  return false;
}
