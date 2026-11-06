import { MastraClient } from '@mastra/client-js';
import { nanoid } from 'nanoid';
import { BadGatewayException } from '../../utils';

const ASSISTANT_AGENT_ID = 'assistant';

const client = new MastraClient({
  baseUrl: process.env.MASTRA_URL || 'http://localhost:4111',
  // Varsayılan 3 tekrar, kalıcı hatalarda (ör. eksik API anahtarı) kullanıcıyı uzun süre bekletiyor
  retries: 1,
});

export abstract class AiService {
  static async chat(params: { message: string; threadId?: string; userId: string }) {
    const threadId = params.threadId ?? nanoid();

    try {
      const result = await client.getAgent(ASSISTANT_AGENT_ID).generate(params.message, {
        memory: {
          // Thread id'si kullanıcıya göre ayrıştırılır, böylece kullanıcılar birbirinin sohbetine erişemez
          thread: `${params.userId}:${threadId}`,
          resource: params.userId,
        },
      });

      return { text: result.text, threadId };
    } catch (error) {
      console.error('Error in AiService.chat:', error);
      throw new BadGatewayException('Asistandan yanıt alınamadı');
    }
  }
}
