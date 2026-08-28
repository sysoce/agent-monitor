export class MockElement {
  tagName: string;
  className: string = '';
  classList = {
    _classes: new Set<string>(),
    add: (...cls: string[]) => cls.forEach((c) => this.classList._classes.add(c)),
    remove: (...cls: string[]) => cls.forEach((c) => this.classList._classes.delete(c)),
    contains: (c: string) => this.classList._classes.has(c) || this.className.split(/\s+/).includes(c),
    toggle: (c: string, force?: boolean) => {
      const has = force ?? !this.classList.contains(c);
      if (has) this.classList.add(c);
      else this.classList.remove(c);
      return has;
    },
  };
  attributes: Record<string, string> = {};
  children: any[] = [];
  parentNode: any = null;
  textContent: string = '';
  innerHTML: string = '';
  dataset: Record<string, string> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  appendChild<T = any>(child: T): T {
    const c = child as any;
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    this.children.push(c);
    return child;
  }

  insertBefore<T = any>(child: T, ref: any): T {
    const c = child as any;
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    if (!ref) {
      this.children.push(c);
      return child;
    }
    const idx = this.children.indexOf(ref);
    if (idx === -1) this.children.push(c);
    else this.children.splice(idx, 0, c);
    return child;
  }

  removeChild<T = any>(child: T): T {
    const c = child as any;
    const idx = this.children.indexOf(c);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      c.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  closest(selector: string): MockElement | null {
    let current: MockElement | null = this;
    const matches = (el: MockElement) => {
      if (selector.includes(',')) return selector.split(',').some((s) => el.matches(s.trim()));
      return el.matches(selector);
    };
    while (current) {
      if (matches(current)) return current;
      current = current.parentNode;
    }
    return null;
  }

  matches(selector: string): boolean {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    if (selector.startsWith('#')) return this.getAttribute('id') === selector.slice(1);
    if (selector.startsWith('[') && selector.endsWith(']')) return this.getAttribute(selector.slice(1, -1)) !== null;
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelector(selector: string): MockElement | null {
    const matches = this.querySelectorAll(selector);
    return matches.length > 0 ? matches[0] : null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const traverse = (el: MockElement) => {
      for (const child of el.children) {
        if (child.matches(selector)) results.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  addEventListener(_type?: string, _listener?: any, _options?: any) {}
  removeEventListener(_type?: string, _listener?: any, _options?: any) {}
  focus() {}
}

export function installMockDocument(): {
  document: any;
  conversation: MockElement;
  conversationEmpty: MockElement;
  sendBtn: MockElement;
  agentModeLabel: MockElement;
  agentModeMenu: MockElement;
} {
  const conversation = new MockElement('div');
  conversation.className = 'conversation';
  conversation.setAttribute('id', 'conversation');
  const conversationEmpty = new MockElement('div');
  conversationEmpty.setAttribute('id', 'conversationEmpty');
  const sendBtn = new MockElement('button');
  sendBtn.setAttribute('id', 'sendBtn');
  const agentModeLabel = new MockElement('span');
  agentModeLabel.setAttribute('id', 'agentModeLabel');
  const agentModeMenu = new MockElement('div');
  agentModeMenu.setAttribute('id', 'agentModeMenu');

  const elementsById: Record<string, MockElement> = {
    conversation, conversationEmpty, sendBtn, agentModeLabel, agentModeMenu,
  };

  const doc = {
    createElement: (tag: string) => new MockElement(tag),
    getElementById: (id: string) => elementsById[id] || null,
    querySelector: (sel: string) => (sel === '.conversation' || sel === '#conversation' ? conversation : null),
    querySelectorAll: (sel: string) => (sel === '.conversation' || sel === '#conversation' ? [conversation] : []),
  };
  (global as any).document = doc;
  return { document: doc, conversation, conversationEmpty, sendBtn, agentModeLabel, agentModeMenu };
}
