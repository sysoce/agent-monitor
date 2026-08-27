import { resolveLanguage, type LanguageSpec } from './languageSpecs';

export { resolveLanguage, type LanguageSpec };

export type TokenKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'type'
  | 'function'
  | 'operator'
  | 'property';

export interface HighlightToken {
  kind: TokenKind;
  value: string;
}

const IDENT_RE = /[A-Za-z_$][\w$]*/y;
const NUMBER_RE = /0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?/y;
const OPERATOR_CHARS = new Set('+-*/%=<>!&|^~?:.,;()[]{}');

/**
 * Small hand-rolled tokenizer.
 *
 * A full grammar-based highlighter would need WASM, which the webview CSP
 * disallows. This covers the constructs that carry most of the visual signal:
 * comments, strings, numbers, keywords, and call sites.
 */
export function highlight(code: string, lang?: string): HighlightToken[] {
  const spec = resolveLanguage(lang);
  if (!spec) return [{ kind: 'plain', value: code }];

  const tokens: HighlightToken[] = [];
  let plain = '';
  let i = 0;

  const flush = () => {
    if (plain) {
      tokens.push({ kind: 'plain', value: plain });
      plain = '';
    }
  };
  const push = (kind: TokenKind, value: string) => {
    flush();
    tokens.push({ kind, value });
  };

  while (i < code.length) {
    const rest = code.slice(i);

    const lineComment = spec.lineComment?.find((marker) => rest.startsWith(marker));
    if (lineComment) {
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? code.length : end;
      push('comment', code.slice(i, stop));
      i = stop;
      continue;
    }

    if (spec.blockComment && rest.startsWith(spec.blockComment[0])) {
      const close = code.indexOf(spec.blockComment[1], i + spec.blockComment[0].length);
      const stop = close === -1 ? code.length : close + spec.blockComment[1].length;
      push('comment', code.slice(i, stop));
      i = stop;
      continue;
    }

    const quote = spec.strings.find((q) => rest.startsWith(q));
    if (quote) {
      let j = i + quote.length;
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code.startsWith(quote, j)) {
          j += quote.length;
          break;
        }
        j += 1;
      }
      push('string', code.slice(i, Math.min(j, code.length)));
      i = j;
      continue;
    }

    NUMBER_RE.lastIndex = i;
    const number = NUMBER_RE.exec(code);
    if (number && number.index === i && !/[\w$]/.test(code[i - 1] ?? '')) {
      push('number', number[0]);
      i += number[0].length;
      continue;
    }

    IDENT_RE.lastIndex = i;
    const ident = IDENT_RE.exec(code);
    if (ident && ident.index === i) {
      const word = ident[0];
      const after = code.slice(i + word.length).match(/^\s*\(/);
      if (spec.keywords.has(word)) {
        push(spec.types?.has(word) ? 'type' : 'keyword', word);
      } else if (after) {
        push('function', word);
      } else if (/^[A-Z]/.test(word)) {
        push('type', word);
      } else if (code[i - 1] === '.') {
        push('property', word);
      } else {
        plain += word;
      }
      i += word.length;
      continue;
    }

    if (OPERATOR_CHARS.has(code[i])) {
      push('operator', code[i]);
      i += 1;
      continue;
    }

    plain += code[i];
    i += 1;
  }

  flush();
  return tokens;
}
