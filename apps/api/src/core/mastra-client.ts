import { MastraClient } from '@mastra/client-js';

export const MASTRA_URL = process.env.MASTRA_URL || 'http://localhost:4111';

// Mastra'ya bağlanan tek istemci; AI sohbeti ve doküman analizi bunu paylaşır
export const mastraClient = new MastraClient({
  baseUrl: MASTRA_URL,
  // Varsayılan 3 tekrar, kalıcı hatalarda (ör. eksik API anahtarı) kullanıcıyı uzun süre bekletiyor
  retries: 1,
});
