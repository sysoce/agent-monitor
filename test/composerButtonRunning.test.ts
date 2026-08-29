import { test } from "node:test";
import * as assert from "node:assert/strict";
import { updateComposerButton, isAgentRunning } from "../src/ui/composerButton";
import type { AppState } from "../src/ui/types";

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: "chat",
    sessions: [],
    plans: [],
    syncStatus: "connected",
    searchQuery: "",
    composerMode: "agent",
    selectedModel: "antigravity|gemini-3.7-flash-high|model",
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    ...overrides,
  };
}

test("isAgentRunning detects all active running indicators", () => {
  // isSending
  assert.equal(isAgentRunning(createMockState({ isSending: true })), true);

  // isAwaitingResponse
  assert.equal(isAgentRunning(createMockState({ isAwaitingResponse: true })), true);

  // activeSession isGenerating
  assert.equal(isAgentRunning(createMockState({
    activeSession: { id: "s1", title: "S1", mode: "agent", createdAt: 0, updatedAt: 0, messages: [], filesChanged: [], artifacts: [], subagents: [], isGenerating: true },
  })), true);

  // background tasks running
  assert.equal(isAgentRunning(createMockState({
    activeSession: { id: "s1", title: "S1", mode: "agent", createdAt: 0, updatedAt: 0, messages: [], filesChanged: [], artifacts: [], subagents: [], backgroundTasks: [{ id: "t1", name: "build", status: "running" }] },
  })), true);

  // sessions list has isGenerating for active session
  assert.equal(isAgentRunning(createMockState({
    activeSessionId: "s2",
    sessions: [{ id: "s2", title: "S2", preview: "", createdAt: 0, updatedAt: 0, messageCount: 1, isGenerating: true }],
  })), true);

  // live assistant turn in activeSession
  assert.equal(isAgentRunning(createMockState({
    activeSession: { id: "s1", title: "S1", mode: "agent", createdAt: 0, updatedAt: 0, messages: [{ role: "assistant", content: "...", isLive: true } as any], filesChanged: [], artifacts: [], subagents: [] },
  })), true);

  // idle state
  assert.equal(isAgentRunning(createMockState()), false);
});

test("updateComposerButton updates composer-actions innerHTML when actions container exists", () => {
  let actionsHtml = "";
  const mockActions: any = {
    get innerHTML() { return actionsHtml; },
    set innerHTML(val: string) { actionsHtml = val; },
  };
  const mockTextarea: any = { value: "draft prompt" };
  const mockDoc: any = {
    querySelector: (sel: string) => {
      if (sel === ".composer-actions") return mockActions;
      if (sel === "#composer-input") return mockTextarea;
      return null;
    },
    getElementById: (id: string) => (id === "composer-input" ? mockTextarea : null),
  };

  const runningState = createMockState({ isSending: true });
  updateComposerButton(runningState, mockDoc);

  assert.ok(actionsHtml.includes('id="btn-stop"'), "Stop button MUST be present in actions container");
  assert.ok(actionsHtml.includes('id="btn-send"'), "Send button is also present with draft text");

  // Clear text while running
  mockTextarea.value = "";
  updateComposerButton(runningState, mockDoc);
  assert.ok(actionsHtml.includes('id="btn-stop"'), "Stop button remains present when draft is cleared");
  assert.ok(!actionsHtml.includes('id="btn-send"'), "Send button removed when draft is empty");

  // Idle state
  const idleState = createMockState({ isSending: false });
  updateComposerButton(idleState, mockDoc);
  assert.ok(!actionsHtml.includes('id="btn-stop"'), "Stop button not rendered when idle");
  assert.ok(actionsHtml.includes('id="btn-send"'), "Send button rendered when idle");
});
