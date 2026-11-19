export const CHUNK_SIZE = 2000;
export const CHUNK_OVERLAP = 200;

// Kesim noktası olarak tercih edilen ayraçlar: önce paragraf, sonra cümle sonu, en son boşluk
const BREAK_PATTERNS = [/\n\n/g, /[.!?]\s/g, /\s/g];

// Pencerenin ikinci yarısındaki en son ayracı bulur; yoksa pencerenin sonunda keser
const findBreak = (window: string) => {
  const minEnd = Math.floor(window.length / 2);
  for (const pattern of BREAK_PATTERNS) {
    let end = -1;
    for (const match of window.matchAll(pattern)) {
      const matchEnd = match.index + match[0].length;
      if (matchEnd >= minEnd) end = matchEnd;
    }
    if (end > 0) return end;
  }
  return window.length;
};

// Uzun metni, birbiriyle kısmen örtüşen parçalara böler
export const chunkText = (text: string): string[] => {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const window = text.slice(start, start + CHUNK_SIZE);
    const isLast = start + CHUNK_SIZE >= text.length;
    const end = isLast ? window.length : findBreak(window);

    const chunk = window.slice(0, end).trim();
    if (chunk) chunks.push(chunk);

    if (isLast) break;
    // Örtüşme, bir sonraki parçanın kelime ortasından başlamaması için ilk boşluktan sonraya alınır
    const overlapStart = start + Math.max(end - CHUNK_OVERLAP, 1);
    const spaceAfter = text.slice(overlapStart, start + end).search(/\s/);
    start = spaceAfter >= 0 ? overlapStart + spaceAfter + 1 : overlapStart;
  }

  return chunks;
};
