import { cleanPath } from './toolFormatting';

export interface DiffLine {
  type: 'added' | 'deleted' | 'context';
  lineNum: number;
  content: string;
}

export interface DiffCardOptions {
  filePath: string;
  startLine: number;
  lines: DiffLine[];
  deletions: number;
  additions: number;
}

export function tryExtractDiffOptions(
  tool: string,
  args?: Record<string, unknown>
): DiffCardOptions | null {
  if (!args) return null;
  const t = tool.toLowerCase();
  const isEdit =
    t === 'replace_file_content' ||
    t === 'str_replace' ||
    t === 'edit_file' ||
    t === 'patch' ||
    t === 'patch_file';

  if (!isEdit) return null;

  const rawPath =
    args.TargetFile ?? args.targetFile ?? args.path ?? args.filePath ?? args.file;
  if (!rawPath) return null;
  const filePath = cleanPath(String(rawPath));

  const startLine = Number(args.StartLine ?? args.start_line ?? args.startLine ?? 1);
  const targetContent = String(
    args.TargetContent ?? args.targetContent ?? args.old_str ?? args.oldStr ?? ''
  );
  const replacementContent = String(
    args.ReplacementContent ?? args.replacementContent ?? args.new_str ?? args.newStr ?? ''
  );

  if (!targetContent && !replacementContent) return null;

  const oldLines = targetContent ? targetContent.split('\n') : [];
  const newLines = replacementContent ? replacementContent.split('\n') : [];

  const lines: DiffLine[] = [];
  let curLine = startLine;

  for (const line of oldLines) {
    lines.push({ type: 'deleted', lineNum: curLine, content: line });
    curLine++;
  }
  for (const line of newLines) {
    lines.push({ type: 'added', lineNum: curLine, content: line });
    curLine++;
  }

  return {
    filePath,
    startLine,
    lines,
    deletions: oldLines.length,
    additions: newLines.length,
  };
}
