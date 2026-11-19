import { MASTRA_URL } from '../../core/mastra-client';

// Metinleri vektöre çevirmek için Mastra'ya sorar; OpenRouter anahtarı sadece Mastra'dadır
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const response = await fetch(`${MASTRA_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  if (!response.ok) throw new Error(`Mastra /embed ${response.status}`);

  const { embeddings } = (await response.json()) as { embeddings: number[][] };
  return embeddings;
};
