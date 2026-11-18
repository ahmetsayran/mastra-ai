// Ücretsiz model, bazı çoklu isteklerde sunucu hatası veriyor, zaman zaman da istek sınırına takılıyor.
// Bu yüzden metinler tek tek gönderilir ve hata olursa artan aralıklarla birkaç kez denenir.
const EMBEDDING_MODEL = 'nvidia/nemotron-3.5-embed-8b:free';
const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const embedText = async (text: string): Promise<number[]> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });

    if (response.ok) {
      const { data } = (await response.json()) as { data: { embedding: number[] }[] };
      return data[0].embedding;
    }
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS * attempt);
  }
  throw new Error('Embedding alınamadı');
};

// Metinleri OpenRouter üzerinden sayı dizilerine (vektör) çevirir; sıra girdiyle aynıdır
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const embeddings: number[][] = [];
  for (const text of texts) embeddings.push(await embedText(text));
  return embeddings;
};
