import { BadGatewayException } from '../../utils';

const MASTRA_URL = process.env.MASTRA_URL || 'http://localhost:4111';
// Tek istekte çok metin göndermek Mastra'da zaman aşımına yol açtığı için gruplar halinde gönderilir
const BATCH_SIZE = 10;

const embedBatch = async (texts: string[]): Promise<number[][]> => {
  const response = await fetch(`${MASTRA_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  if (!response.ok) throw new Error(`Mastra /embed ${response.status}`);

  const { embeddings } = (await response.json()) as { embeddings: number[][] };
  return embeddings;
};

// Metinleri vektöre çevirmek için Mastra'ya sorar; OpenRouter anahtarı sadece Mastra'dadır
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  try {
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      embeddings.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE))));
    }
    return embeddings;
  } catch (error) {
    console.error('Error in embedTexts:', error);
    throw new BadGatewayException('Doküman parçaları vektöre çevrilemedi');
  }
};
