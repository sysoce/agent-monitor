const KNOWN_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'json5', 'jsonc',
  'md', 'markdown', 'css', 'scss', 'sass', 'less', 'html', 'htm',
  'xml', 'svg', 'yaml', 'yml', 'toml', 'ini', 'sh', 'bash', 'zsh', 'fish',
  'py', 'pyi', 'rs', 'go', 'c', 'h', 'cpp', 'hpp', 'cc', 'cxx',
  'java', 'kt', 'kts', 'swift', 'rb', 'php', 'cs', 'sql', 'graphql',
  'gql', 'vue', 'svelte', 'astro', 'wasm', 'map', 'lock', 'txt', 'log',
  'env', 'csv', 'tsv', 'conf', 'config', 'proto',
]);

const SPECIAL_FILENAMES = new Set([
  'dockerfile', 'makefile', 'containerfile', 'procfile', 'gemfile',
  'rakefile', '.gitignore', '.npmignore', '.eslintrc', '.prettierrc',
  '.env', 'license', 'readme', 'agents.md',
]);

/**
 * Pure heuristic to determine if an inline token or code span represents a workspace file or path.
 */
export function isFilePathCandidate(rawText: string): boolean {
  if (!rawText || typeof rawText !== 'string') return false;
  const str = rawText.trim();
  if (!str || str.length > 300) return false;

  // Explicit URIs
  if (/^(?:file|vscode):\/\//i.test(str)) return true;
  if (/^https?:\/\//i.test(str)) return true;

  // Disallow whitespaces or characters that signify code statements or commands
  if (/[\r\n\t\s]/.test(str)) return false;
  if (/[;{}()=><`"'$*?|!]/.test(str)) return false;

  // Semver check (e.g. 1.0.0, v2.1.0)
  if (/^v?\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9_.-]+)?$/i.test(str)) return false;

  // Strip line numbers and hash fragments
  const clean = str
    .replace(/#L\d+(?:-L?\d+)?$/i, '')
    .replace(/:\d+(?:[:-]\d+)?$/, '');
  if (!clean) return false;

  const normalized = clean.replace(/\\/g, '/');
  const baseName = normalized.split('/').pop() || '';
  const lowerBase = baseName.toLowerCase();

  // Special files
  if (SPECIAL_FILENAMES.has(lowerBase)) return true;

  // TypeScript definition files
  if (lowerBase.endsWith('.d.ts')) return true;

  // Standard extension check
  if (lowerBase.includes('.')) {
    const ext = lowerBase.split('.').pop() || '';
    if (ext && KNOWN_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  // Paths with directories (e.g. src/model/providers or ./dist/)
  if (normalized.includes('/')) {
    if (normalized.startsWith('./') || normalized.startsWith('../') || normalized.startsWith('/')) {
      return true;
    }
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return true;
    }
  }

  return false;
}
