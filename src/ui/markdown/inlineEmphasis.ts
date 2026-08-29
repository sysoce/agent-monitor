import type { InlineNode } from './inlineTypes';

export function parseEmphasis(
  source: string,
  start: number,
  marker: string,
  parseInlineFn: (src: string) => InlineNode[]
): { node: InlineNode; end: number } | undefined {
  const run = new RegExp(`^\\${marker}{1,3}`).exec(source.slice(start))![0];
  const width = run.length >= 2 ? 2 : 1;
  const delimiter = marker.repeat(width);

  // `_` inside a word is a separator (snake_case), not emphasis.
  if (marker === '_' && start > 0 && /\w/.test(source[start - 1])) return undefined;

  const searchFrom = start + delimiter.length;
  if (/^\s/.test(source.slice(searchFrom))) return undefined;

  const close = source.indexOf(delimiter, searchFrom);
  if (close === -1) return undefined;

  const content = source.slice(searchFrom, close);
  if (!content.trim()) return undefined;

  return {
    node: {
      type: width === 2 ? 'strong' : 'em',
      children: parseInlineFn(content),
    },
    end: close + delimiter.length,
  };
}
