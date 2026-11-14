import { describe, expect, test } from 'bun:test';
import { maskSecrets, outputGuardrails } from './guardrails';

type Part = { type: string; payload?: { text: string } };

const run = async (parts: Part[]) => {
  const [processor] = outputGuardrails();
  const state: Record<string, unknown> = {};
  const out: unknown[] = [];
  for (const part of parts) {
    // biome-ignore lint/suspicious/noExplicitAny: test için sahte parça
    const result = await (processor as any).processOutputStream({
      part,
      state,
      streamParts: [],
      abort: () => undefined,
    });
    if (result) out.push(result);
  }
  return out as Part[];
};

describe('guardrail', () => {
  test('API anahtarı maskelenir, normal metin ve işlemler bozulmaz', () => {
    expect(maskSecrets('anahtar sk-abcdefghijklmnopqrstuvwx bitti')).toBe(
      'anahtar [ANAHTAR] bitti',
    );
    expect(maskSecrets('12345678901 * 3 = 37037036703')).toBe('12345678901 * 3 = 37037036703');
  });

  test('çıktı: parçalar tutulur, cevap bitince tek parça ve maskeli gelir', async () => {
    const out = await run([
      { type: 'text-start' },
      { type: 'text-delta', payload: { text: 'Anahtar: sk-abcdefghij' } },
      { type: 'text-delta', payload: { text: 'klmnopqrstuvwx tamam' } },
      { type: 'text-end' },
    ]);

    expect(out.map((p) => p.type)).toEqual(['text-start', 'text-delta']);
    expect(out[1]?.payload?.text).toBe('Anahtar: [ANAHTAR] tamam');
  });
});
