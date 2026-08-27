export interface ExtractedWalkthroughMeta {
  title: string;
  summary: string;
  path: string;
}

export function isWalkthroughFilePath(filePath: string): boolean {
  const norm = filePath.toLowerCase().replace(/\\/g, '/');
  return norm.endsWith('walkthrough.md') || norm.includes('walkthrough');
}

export function extractWalkthroughMeta(filePath: string, content: string): ExtractedWalkthroughMeta {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Walkthrough';
  const lines = content.split(/\r?\n/);
  let summary = '';
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('```')) {
      summary = t.slice(0, 200);
      break;
    }
  }
  return { title, summary: summary || title, path: filePath };
}
