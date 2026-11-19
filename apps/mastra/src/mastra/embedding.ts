import { ModelRouterEmbeddingModel } from '@mastra/core/llm';

// Ücretsiz model, bazı çoklu isteklerde sunucu hatası veriyor, zaman zaman da istek sınırına takılıyor.
// Bu yüzden metinler tek tek gönderilir ve hata olursa artan aralıklarla birkaç kez denenir.
const EMBEDDING_MODEL = { providerId: 'openrouter', modelId: 'nvidia/nemotron-3.5-embed-8b:free' };
const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const embedText = async (embedder: ModelRouterEmbeddingModel, text: string): Promise<number[]> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const { embeddings } = await embedder.doEmbed({ values: [text] });
      return embeddings[0];
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw error;
      await wait(RETRY_DELAY_MS * attempt);
    }
  }
};

// Metinleri Mastra'nın embedding sınıfıyla (OpenRouter) sayı dizilerine çevirir; sıra girdiyle aynıdır
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const embedder = new ModelRouterEmbeddingModel(EMBEDDING_MODEL);
  const embeddings: number[][] = [];
  for (const text of texts) embeddings.push(await embedText(embedder, text));
  return embeddings;
};
