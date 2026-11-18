import { BadGatewayException } from '../../utils';

const MASTRA_URL = process.env.MASTRA_URL || 'http://localhost:4111';

// Metinleri vektöre çevirmek için Mastra'ya sorar; OpenRouter anahtarı sadece Mastra'dadır
export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  try {
    const response = await fetch(`${MASTRA_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    if (!response.ok) throw new Error(`Mastra /embed ${response.status}`);

    const { embeddings } = (await response.json()) as { embeddings: number[][] };
    return embeddings;
  } catch (error) {
    console.error('Error in embedTexts:', error);
    throw new BadGatewayException('Doküman parçaları vektöre çevrilemedi');
  }
};
