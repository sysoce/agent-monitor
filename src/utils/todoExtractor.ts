export interface ExtractedTodoItem {
  id: string;
  content: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export function extractTodosFromMarkdown(body: string): ExtractedTodoItem[] {
  const todos: ExtractedTodoItem[] = [];
  const lines = body.split(/\r?\n/);
  let stepIndex = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let isChecked = false;
    let content = '';

    const listMatch = trimmed.match(/^(?:[-*]\s+(?:\[([\s xX])\]\s*)?|\d+\.\s+)(.+)$/);
    if (listMatch) {
      isChecked = Boolean(listMatch[1] && listMatch[1].toLowerCase() === 'x');
      content = listMatch[2];
    } else {
      const headerMatch = trimmed.match(/^(?:#{2,4}\s+|\*\*)(?:\d+\.\s+|(?:Step|Phase|Task)\s+\d+:?\s*)([^*#\n]+)(?:\*\*)?$/i);
      if (headerMatch) content = headerMatch[1];
    }

    if (content) {
      const cleaned = content
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/^`+|`+$/g, '')
        .trim();
      if (
        cleaned &&
        cleaned.length > 3 &&
        !cleaned.startsWith('http://') &&
        !cleaned.startsWith('https://') &&
        !/^(name\/title|name|title|overview|notes|next steps|verification|summary)/i.test(cleaned)
      ) {
        todos.push({
          id: `step-${stepIndex++}`,
          content: cleaned,
          text: cleaned,
          status: isChecked ? 'completed' : 'pending',
        });
      }
    }
  }
  return todos;
}
