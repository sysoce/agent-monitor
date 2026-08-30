import type { AppState, AttachmentItem } from './types';

export type ReadFileFn = (file: Blob) => Promise<string>;

export async function defaultReadFileAsDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function defaultReadFileAsText(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function handleFileDropOrPaste(
  state: AppState,
  files: Array<{ name?: string; type?: string; size?: number } & Blob>,
  onRender: () => void,
  readDataUrlFn: ReadFileFn = defaultReadFileAsDataUrl,
  readTextFn: ReadFileFn = defaultReadFileAsText
): Promise<void> {
  if (!files || files.length === 0) return;

  const currentAtts = [...(state.attachments || [])];
  for (const file of files) {
    const isImage = Boolean(file.type?.startsWith('image/'));
    const label = file.name || (isImage ? `screenshot-${Date.now()}.png` : `file-${Date.now()}`);
    let content = '';
    try {
      if (isImage) {
        content = await readDataUrlFn(file);
      } else {
        content = await readTextFn(file);
      }
    } catch {
      continue;
    }

    currentAtts.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: isImage ? 'image' : 'file',
      label,
      content,
    });
  }

  state.attachments = currentAtts;
  onRender();
}

export function extractFilesFromEvent(e: DragEvent | ClipboardEvent): File[] {
  const files: File[] = [];
  if ('dataTransfer' in e && e.dataTransfer?.files) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const f = e.dataTransfer.files.item(i);
      if (f) files.push(f);
    }
  } else if ('clipboardData' in e && e.clipboardData) {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const f = e.clipboardData.files.item(i);
        if (f) files.push(f);
      }
    } else if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item && item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }
  }
  return files;
}
