export const PREFERRED_VISION_MODEL_RE =
  /gpt-4o|gpt-4-turbo|gpt-4-vision|o1-|o3-|o4-|claude-3|claude-sonnet-4|claude-opus-4|gemini-.*-vision|gemini-1\.5|gemini-2|llava|bakllava|moondream|vision|bonsai|minicpm-v|qwen2[\s.-]?vl|qwen[\w.-]*-vl|pixtral|llama3\.2-vision|gemma3|gemma-3|qwen2\.5vl|mmproj/i;

export function modelSupportsImages(options?: {
  provider?: string;
  model?: string;
  endpointId?: string;
}): boolean {
  if (!options) return false;
  const provider = options.provider?.toLowerCase();
  const model = options.model?.toLowerCase() ?? '';
  if (provider === 'puter' || provider === 'cursor' || provider === 'vscode' || provider === 'gemini') {
    return true;
  }
  if (provider === 'ollama') {
    return PREFERRED_VISION_MODEL_RE.test(model);
  }
  if (provider === 'openai' || provider === 'auto') return true;
  return PREFERRED_VISION_MODEL_RE.test(model);
}

export function openAiCompatibleModelLikelyThinks(model: string): boolean {
  const m = model.toLowerCase();
  if (m.includes('qwen3-coder') || m.includes('qwen3.8') || m.includes('qwen3.5')) return false;
  return (
    m.includes('reasoner') ||
    m.includes('deepseek-r1') ||
    m.includes('o1') ||
    m.includes('o3') ||
    m.includes('gemma-4') ||
    m.includes('qwen3.6') ||
    m.includes('bonsai')
  );
}
