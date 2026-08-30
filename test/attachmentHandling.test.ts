import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUserTurn } from '../src/ui/components/chatTurnRenderer';
import { renderAttachmentPill } from '../src/ui/components/attachmentPill';
import type { ChatMessage } from '../src/types';
import { handleFileDropOrPaste } from '../src/ui/dropPasteHandler';
import type { AppState } from '../src/ui/types';

test('renderUserTurn renders both msg.attachments and msg.images as visual attachment pills', () => {
  const msgWithAtts: ChatMessage = {
    role: 'user',
    content: 'Look at this screenshot',
    attachments: [
      {
        id: 'att-1',
        type: 'image',
        label: 'error-screenshot.png',
        content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    ],
  } as any;

  const html1 = renderUserTurn(msgWithAtts);
  assert.ok(html1.includes('attachment-pill'), 'User turn must render attachment-pill container');
  assert.ok(html1.includes('error-screenshot.png'), 'Attachment pill must show file label');
  assert.ok(html1.includes('data:image/png;base64,'), 'Image attachment must render data URL in img tag');

  const msgWithImagesOnly: ChatMessage = {
    role: 'user',
    content: 'Here is the bug',
    images: [
      {
        path: '.agent/sessions/s1/screenshot_1.png',
        label: 'screenshot_1.png',
      },
    ],
  } as any;

  const html2 = renderUserTurn(msgWithImagesOnly);
  assert.ok(html2.includes('attachment-pill'), 'User turn with msg.images must render attachment pill');
  assert.ok(html2.includes('screenshot_1.png'), 'Image label must be rendered');
});

test('renderAttachmentPill handles data URL and path correctly', () => {
  const dataPill = renderAttachmentPill({
    id: 'a1',
    type: 'image',
    label: 'test.png',
    content: 'data:image/png;base64,abc1234',
  }, false);
  assert.ok(dataPill.includes('src="data:image/png;base64,abc1234"'), 'Data URL is preserved in img src');

  const pathPill = renderAttachmentPill({
    id: 'a2',
    type: 'image',
    label: 'sidecar.jpg',
    path: '.agent/sessions/s1/sidecar.jpg',
  }, false);
  assert.ok(pathPill.includes('/api/files?path='), 'Path-based image attachment resolves to /api/files endpoint');
});

test('handleFileDropOrPaste converts image files to image attachments in state', async () => {
  const state = {
    sessions: [],
    syncMode: 'live-sse',
    syncStatus: 'connected',
    activeTab: 'chat',
    composerMode: 'agent',
    isMentionOpen: false,
    isModelPickerOpen: false,
    selectedModel: 'gemini-2.5-pro',
    availableModels: [],
    customConnections: [],
  } as unknown as AppState;

  const dummyBlob = {
    name: 'bug.png',
    type: 'image/png',
    size: 100,
  };

  // Mock reader
  let rendered = false;
  const mockReadFileAsDataUrl = async (_file: any) => 'data:image/png;base64,fakeimgdata';

  await handleFileDropOrPaste(state, [dummyBlob as any], () => { rendered = true; }, mockReadFileAsDataUrl);

  assert.equal(state.attachments?.length, 1);
  assert.equal(state.attachments?.[0]?.type, 'image');
  assert.equal(state.attachments?.[0]?.label, 'bug.png');
  assert.equal(state.attachments?.[0]?.content, 'data:image/png;base64,fakeimgdata');
  assert.equal(rendered, true, 'Render callback must be invoked after files processed');
});
