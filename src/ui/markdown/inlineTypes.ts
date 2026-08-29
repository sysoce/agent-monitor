export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'em'; children: InlineNode[] }
  | { type: 'strike'; children: InlineNode[] }
  | { type: 'link'; href: string; title?: string; children: InlineNode[] }
  | { type: 'image'; src: string; alt: string }
  | { type: 'break' };

export interface LinkLike {
  label: string;
  href: string;
  title?: string;
  end: number;
}
