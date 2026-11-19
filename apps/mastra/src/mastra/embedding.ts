import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { embedV2 } from '@mastra/core/vector';
import { EMBEDDING_MODEL } from './model';

// Ücretsiz model, bazı çoklu isteklerde sunucu hatası veriyor, zaman zaman da istek sınırına takılıyor.
// Bu yüzden metinler tek tek gönderilir; hata olursa Mastra artan aralıklarla birkaç kez yeniden dener.
const MAX_RETRIES = 5;

// Metinleri Mastra'nın embedding modeliyle (OpenRouter) sayı dizilerine çevirir; sıra girdiyle aynıdır
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const model = new ModelRouterEmbeddingModel(EMBEDDING_MODEL);
  const embeddings: number[][] = [];
  for (const value of texts) {
    const { embedding } = await embedV2({ model, value, maxRetries: MAX_RETRIES });
    embeddings.push(embedding);
  }
  return embeddings;
};
