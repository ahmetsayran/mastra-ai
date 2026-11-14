import { PromptInjectionDetector, RegexFilterProcessor } from '@mastra/core/processors';
import type { OutputProcessor } from '@mastra/core/processors';

// Sistemi koruma: API anahtarı gibi gizli değerler maskelenir
const MASK_RULES = [
  {
    name: 'api-key',
    pattern: /\b(?:sk|ghp|gho|xox[bp])[-_][A-Za-z0-9_-]{20,}/g,
    replacement: '[ANAHTAR]',
  },
];

export const maskSecrets = (text: string) =>
  MASK_RULES.reduce((result, rule) => result.replace(rule.pattern, rule.replacement), text);

// Cevabın tamamını bekler, maskeler, sonra tek parça olarak gönderir.
// Akıcı gösterim API tarafında yapılır (parçalara bölünüp yavaş yavaş gönderilir).
const fullBufferOutput: OutputProcessor = {
  id: 'full-buffer-output',
  async processOutputStream({ part, state }) {
    if (part.type === 'text-delta') {
      state['held'] = ((state['held'] as string | undefined) ?? '') + part.payload.text;
      state['lastDelta'] = part;
      return null;
    }

    if (part.type === 'text-end' && typeof state['held'] === 'string') {
      const text = state['held'];
      const lastDelta = state['lastDelta'] as typeof part & { payload: { text: string } };
      state['held'] = undefined;
      return { ...lastDelta, payload: { ...lastDelta.payload, text: maskSecrets(text) } };
    }

    return part;
  },
};

// Girdi: gizli değerler maskelenir, "önceki talimatları unut" gibi saldırılar engellenir.
export const inputGuardrails = (model: string) => [
  new RegexFilterProcessor({ rules: MASK_RULES, strategy: 'redact', phase: 'input' }),
  new PromptInjectionDetector({ model, strategy: 'block', lastMessageOnly: true }),
];

export const outputGuardrails = () => [fullBufferOutput];
