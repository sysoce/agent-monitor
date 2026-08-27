import { cleanPath, truncateString } from '../utils/toolFormatting';

export function formatToolSummary(tool: string, args?: Record<string, unknown>): string {
  const t = tool.toLowerCase();
  const a = args || {};

  const rawPath =
    a.path ?? a.filePath ?? a.targetFile ?? a.TargetFile ?? a.target_file ?? a.AbsolutePath ?? a.file ?? a.DirectoryPath ?? a.SearchDirectory ?? a.SearchPath;
  const targetPath = rawPath != null ? cleanPath(String(rawPath)) : '';
  const command = a.command ?? a.CommandLine ?? a.cmd ? truncateString(String(a.command ?? a.CommandLine ?? a.cmd)) : '';
  const query = a.query ?? a.Query ?? a.pattern ?? a.Pattern ? truncateString(String(a.query ?? a.Query ?? a.pattern ?? a.Pattern)) : '';
  const url = a.Url ?? a.url ? truncateString(String(a.Url ?? a.url)) : '';

  if (t === 'read_file' || t === 'view_file' || t === 'read_file_content' || t === 'read') {
    if (!targetPath) return 'Read file';
    const startLine = a.StartLine ?? a.start_line ?? a.startLine ?? a.offset;
    const endLine = a.EndLine ?? a.end_line ?? a.endLine ?? a.limit;
    const lineSuffix = startLine != null && endLine != null ? ` L${startLine}-${endLine}` : startLine != null ? ` L${startLine}` : '';
    return `Read ${targetPath}${lineSuffix}`;
  }

  if (t === 'list_dir' || t === 'list_directory') return `Explored ${targetPath || '.'}`;
  if (t === 'find' || t === 'find_by_name' || t === 'find_files' || t === 'glob') {
    return `Explored ${query || targetPath || 'files'}`;
  }

  if (
    t === 'write_file' || t === 'write_to_file' || t === 'create_file' || t === 'create_new_file' ||
    t === 'new_file' || t === 'str_replace' || t === 'replace_file_content' || t === 'apply_patch' ||
    t === 'edit_file' || t === 'multi_edit' || t === 'patch_file' || t === 'patch'
  ) {
    return `Edited ${targetPath || 'file'}`;
  }

  if (t === 'delete_file' || t === 'remove_file' || t === 'rm' || t === 'delete') {
    return `Deleted ${targetPath || 'file'}`;
  }

  if (t === 'bash' || t === 'run_command' || t === 'execute_command' || t === 'shell') {
    return `Ran ${command || 'command'}`;
  }

  if (t === 'grep' || t === 'grep_search' || t === 'search_files' || t === 'codebase_search') {
    return `Searched ${query || targetPath || ''}`.trim() || 'Searched';
  }
  if (t === 'web_search') return `Searched ${query || ''}`.trim() || 'Searched';
  if (t === 'read_url_content' || t === 'web_fetch') return `Read ${url || 'url'}`;

  if (t === 'read_lints' || t === 'get_diagnostics' || t === 'lint') {
    return targetPath ? `Read lints ${targetPath}` : 'Read lints';
  }
  if (t === 'fix_lints') return targetPath ? `Fixed lints ${targetPath}` : 'Fixed lints';

  if (t === 'create_plan' || t === 'build_plan') {
    const title = a.title ? truncateString(String(a.title)) : '';
    return `Created plan ${title}`.trim();
  }
  if (t === 'todo_write') return 'Updated todos';

  if (t === 'task' || t === 'invoke_subagent') {
    const desc = a.description ?? a.prompt ?? a.task ?? a.Role ?? a.TypeName;
    return desc ? `Task: ${truncateString(String(desc))}` : 'Task';
  }

  const firstVal =
    targetPath ||
    command ||
    query ||
    url ||
    Object.values(a).find((v) => typeof v === 'string' && v.length < 60);
  const prettyName = tool.charAt(0).toUpperCase() + tool.slice(1).replace(/_/g, ' ');
  return firstVal ? `${prettyName} ${truncateString(String(firstVal))}` : prettyName;
}
