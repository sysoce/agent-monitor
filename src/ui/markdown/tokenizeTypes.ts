export type ListKind = 'bullet' | 'ordered';

export interface ListItem {
  /** Nesting depth, 0 for top level. */
  depth: number;
  text: string;
  /** Set for `- [ ]` / `- [x]` task items. */
  checked?: boolean;
}

export type BlockToken =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; code: string; closed: boolean; meta?: string }
  | { type: 'list'; kind: ListKind; start: number; items: ListItem[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; header: string[]; align: (string | null)[]; rows: string[][] }
  | { type: 'hr' };
