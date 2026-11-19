import { mastraClient } from '../../core/mastra-client';
import { BadGatewayException } from '../../utils';
import { chunkText } from './chunker';
import { embedTexts } from './embedding';

// Mastra'da tanımlı vektör deposunun adı (apps/mastra/src/mastra/index.ts)
const VECTOR_STORE_NAME = 'documents';

// Analiz için aranan üç bilgi; her biri kendi sorusuyla ilgili parçaları bulur
const QUESTIONS = [
  'Projenin amacı nedir?',
  'Projenin gereksinimleri nelerdir?',
  'Projede yapılması gereken aksiyonlar ve görevler nelerdir?',
];
const CHUNKS_PER_QUESTION = 3;

// Vektörle birlikte saklanan parça bilgisi
type ChunkMetadata = { index: number; content: string };

// Tek istekte çok parça göndermek Mastra'da zaman aşımına yol açtığı için gruplar halinde işlenir
const BATCH_SIZE = 10;

// Uzun metni parçalar, vektörlerini dokümanın kendi indeksine kaydeder; her soru için en benzer
// parçaları Mastra'nın vektör aramasıyla bulup dokümandaki sırasıyla birleştirir
export const selectRelevantText = async (assetUuid: string, text: string): Promise<string> => {
  const vectorStore = mastraClient.getVector(VECTOR_STORE_NAME);
  const indexName = `document_${assetUuid.replaceAll('-', '_')}`;
  const chunks = chunkText(text);

  try {
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const vectors = await embedTexts(batch);
      if (i === 0) await vectorStore.createIndex({ indexName, dimension: vectors[0]?.length ?? 0 });
      await vectorStore.upsert({
        indexName,
        vectors,
        metadata: batch.map((content, offset) => ({ index: i + offset, content })),
      });
    }

    const selected = new Map<number, string>();
    for (const queryVector of await embedTexts(QUESTIONS)) {
      const results = await vectorStore.query({
        indexName,
        queryVector,
        topK: CHUNKS_PER_QUESTION,
      });
      for (const { metadata } of results) {
        const { index, content } = metadata as ChunkMetadata;
        selected.set(index, content);
      }
    }

    return [...selected]
      .sort(([a], [b]) => a - b)
      .map(([, content]) => content)
      .join('\n\n');
  } catch (error) {
    console.error('Error in selectRelevantText:', error);
    // Yarım kalan indeks geride bırakılmaz
    await vectorStore.delete(indexName).catch(() => undefined);
    throw new BadGatewayException('Doküman parçaları vektöre çevrilemedi veya aranamadı');
  }
};
