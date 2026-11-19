// Varsayılan olarak OpenRouter'daki ücretsiz bir model kullanılır (OPENROUTER_API_KEY gerekir).
// Başka bir model için .env dosyasındaki ASSISTANT_MODEL değerini değiştirin.
export const ASSISTANT_MODEL =
  process.env.ASSISTANT_MODEL || 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free';

// Doküman analizinde kullanılan embedding modeli (OpenRouter)
export const EMBEDDING_MODEL = {
  providerId: 'openrouter',
  modelId: 'nvidia/nemotron-3.5-embed-8b:free',
};
