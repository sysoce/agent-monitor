export interface LanguageSpec {
  keywords: Set<string>;
  types?: Set<string>;
  lineComment?: string[];
  blockComment?: [string, string];
  strings: string[];
  /** Language uses `#` for comments and has no block comments. */
  hashComments?: boolean;
}

const JS_KEYWORDS =
  'const let var function return if else for while do break continue class extends new delete typeof instanceof in of this super import export from default async await yield try catch finally throw switch case void null undefined true false static get set';
const TS_TYPES =
  'string number boolean any unknown never void object symbol bigint interface type enum namespace declare readonly keyof infer implements public private protected abstract';
const PY_KEYWORDS =
  'def class return if elif else for while break continue import from as pass raise try except finally with lambda global nonlocal yield async await None True False and or not in is del assert';
const GO_KEYWORDS =
  'func package import return if else for range var const type struct interface map chan go defer select switch case break continue fallthrough default nil true false';
const RUST_KEYWORDS =
  'fn let mut const struct enum impl trait use pub mod match if else for while loop return break continue where as dyn ref move self Self crate super async await unsafe true false';
const SHELL_KEYWORDS =
  'if then else elif fi for while do done case esac function return export local readonly set unset echo cd exit source alias';

function words(list: string): Set<string> {
  return new Set(list.split(/\s+/));
}

export const LANGUAGES: Record<string, LanguageSpec> = {
  javascript: {
    keywords: words(JS_KEYWORDS),
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
  },
  typescript: {
    keywords: words(`${JS_KEYWORDS} ${TS_TYPES}`),
    types: words(TS_TYPES),
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
  },
  python: {
    keywords: words(PY_KEYWORDS),
    lineComment: ['#'],
    strings: ['"', "'"],
    hashComments: true,
  },
  go: {
    keywords: words(GO_KEYWORDS),
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', '`'],
  },
  rust: {
    keywords: words(RUST_KEYWORDS),
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
  },
  shell: {
    keywords: words(SHELL_KEYWORDS),
    lineComment: ['#'],
    strings: ['"', "'"],
    hashComments: true,
  },
  json: { keywords: words('true false null'), strings: ['"'] },
  css: { keywords: new Set(), blockComment: ['/*', '*/'], strings: ['"', "'"] },
  html: { keywords: new Set(), strings: ['"', "'"] },
};

export const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rs: 'rust',
  golang: 'go',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  console: 'shell',
  terminal: 'shell',
  yml: 'json',
  yaml: 'json',
  c: 'javascript',
  cpp: 'javascript',
  java: 'javascript',
  csharp: 'javascript',
  php: 'javascript',
  ruby: 'python',
  scss: 'css',
};

export function resolveLanguage(lang: string | undefined): LanguageSpec | undefined {
  const key = (lang ?? '').trim().toLowerCase();
  if (!key) return undefined;
  return LANGUAGES[ALIASES[key] ?? key];
}
