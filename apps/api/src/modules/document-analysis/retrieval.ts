import { chunkText } from './chunker';
import { embedTexts } from './embedding';

// Analiz için aranan üç bilgi; her biri kendi sorusuyla ilgili parçaları bulur
const QUESTIONS = [
  'Projenin amacı nedir?',
  'Projenin gereksinimleri nelerdir?',
  'Projede yapılması gereken aksiyonlar ve görevler nelerdir?',
];
const CHUNKS_PER_QUESTION = 5;

const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x ** 2;
    normB += y ** 2;
  }
  return dot / Math.sqrt(normA * normB);
};

// Uzun metni parçalar ve her soru için en benzer parçaları, dokümandaki sırasıyla birleştirir
export const selectRelevantText = async (text: string): Promise<string> => {
  const chunks = chunkText(text);
  const vectors = await embedTexts([...QUESTIONS, ...chunks]);
  const questionVectors = vectors.slice(0, QUESTIONS.length);
  const chunkVectors = vectors.slice(QUESTIONS.length);

  const selected = new Set<number>();
  for (const questionVector of questionVectors) {
    chunkVectors
      .map((vector, index) => ({ index, score: cosineSimilarity(questionVector, vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, CHUNKS_PER_QUESTION)
      .forEach(({ index }) => selected.add(index));
  }

  return [...selected]
    .sort((a, b) => a - b)
    .map((index) => chunks[index])
    .join('\n\n');
};
