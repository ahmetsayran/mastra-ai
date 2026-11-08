import { MastraClient } from '@mastra/client-js';
import { nanoid } from 'nanoid';
import {
  BadGatewayException,
  BadRequestException,
  LockedException,
  NotFoundException,
} from '../../utils';

const ASSISTANT_AGENT_ID = 'assistant';

const TITLE_MAX_LENGTH = 40;

// Mesajın ilk satırından kısa bir sohbet başlığı üretir
const toTitle = (text: string) => {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > TITLE_MAX_LENGTH ? `${oneLine.slice(0, TITLE_MAX_LENGTH)}…` : oneLine;
};

// Mastra mesaj içeriğini opak döndürür, bu yüzden ihtiyacımız olan kısmı burada tanımlıyoruz
type MemoryMessage = {
  id: string;
  role: string;
  content: { parts?: { type: string; text?: string }[] };
};

// Mastra'daki mesajın sadece düz metin kısımlarını birleştirir (düşünme vb. kısımlar atlanır)
const toText = (message: MemoryMessage) =>
  (message.content.parts ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('');

// Sabitleme, kilit, arşiv ve paylaşım bilgisi sohbetin metadata'sında tutulur
type ThreadMetadata = Record<string, unknown>;

const readFlags = (metadata: ThreadMetadata | null | undefined) => ({
  pinned: metadata?.['pinned'] === true,
  locked: metadata?.['locked'] === true,
  archived: metadata?.['archived'] === true,
  shareToken: typeof metadata?.['shareToken'] === 'string' ? metadata['shareToken'] : null,
});

// Geri bildirim sohbet metadata'sında, ekrandaki mesaj sırasına göre tutulur: { "3": "up" }
type Feedback = 'up' | 'down';
const readFeedback = (metadata: ThreadMetadata | null | undefined) => {
  const raw = metadata?.['feedback'];
  return raw && typeof raw === 'object' ? { ...(raw as Record<string, Feedback>) } : {};
};

// Ekranda görünen mesajlar: sadece metni olan kullanıcı ve asistan mesajları
const isVisible = (message: MemoryMessage) =>
  (message.role === 'user' || message.role === 'assistant') && !!toText(message);

const LOCKED_MESSAGE = 'Sohbet kilitli. Önce kilidini açın';
// Asistan araç kullanırken kullanıcıya gösterilen kısa durum yazıları
const TOOL_STATUS: Record<string, string> = {
  get_current_time: 'Saat bakılıyor...',
  calculate: 'Hesaplanıyor...',
};

const ASSISTANT_DOWN_MESSAGE = 'Asistan şu an ulaşılamıyor. Birkaç dakika sonra tekrar deneyin';

// Mastra sunucusu kapalı / erişilemez mi? (bağlantı reddedildi, zaman aşımı vb.)
const UNREACHABLE_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']);
const isUnreachable = (error: unknown) => {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return UNREACHABLE_CODES.has(code ?? '') || /fetch failed|Unable to connect/i.test(message ?? '');
};

const client = new MastraClient({
  baseUrl: process.env.MASTRA_URL || 'http://localhost:4111',
  // Varsayılan 3 tekrar, kalıcı hatalarda (ör. eksik API anahtarı) kullanıcıyı uzun süre bekletiyor
  retries: 1,
});

export abstract class AiService {
  // Mastra'daki thread id'si kullanıcıya göre ayrıştırılır, böylece kullanıcılar birbirinin sohbetine erişemez
  private static memoryThreadId(userId: string, threadId: string) {
    return `${userId}:${threadId}`;
  }

  static async chat(params: { message: string; threadId?: string; userId: string }) {
    const threadId = params.threadId ?? nanoid();
    await AiService.assertWritable(params.userId, params.threadId);

    try {
      const result = await client.getAgent(ASSISTANT_AGENT_ID).generate(params.message, {
        memory: {
          thread: AiService.memoryThreadId(params.userId, threadId),
          resource: params.userId,
        },
      });

      return { text: result.text, threadId };
    } catch (error) {
      console.error('Error in AiService.chat:', error);
      throw new BadGatewayException('Asistandan yanıt alınamadı');
    }
  }

  // Sohbet bu kullanıcıya ait değilse (veya yoksa) 404 döner
  private static async assertOwnThread(memoryThreadId: string, userId: string) {
    const thread = await client
      .getMemoryThread({ threadId: memoryThreadId, agentId: ASSISTANT_AGENT_ID })
      .get();
    if (thread.resourceId !== userId) throw new NotFoundException('Sohbet bulunamadı');
    return thread;
  }

  // Kilitli sohbete yeni mesaj yazılamaz. Henüz var olmayan sohbet kilitli olamaz
  private static async assertWritable(userId: string, threadId?: string) {
    if (!threadId) return;

    let thread: Awaited<ReturnType<typeof AiService.assertOwnThread>>;
    try {
      thread = await AiService.assertOwnThread(AiService.memoryThreadId(userId, threadId), userId);
    } catch (error) {
      if ((error as { status?: number }).status === 404) return;
      throw AiService.toHttpError(error, 'Sohbet kontrol edilemedi');
    }
    if (readFlags(thread.metadata as ThreadMetadata | null).locked) {
      throw new LockedException(LOCKED_MESSAGE);
    }
  }

  private static toHttpError(error: unknown, fallbackMessage: string) {
    if (error instanceof NotFoundException || error instanceof LockedException) return error;
    if ((error as { status?: number }).status === 404) {
      return new NotFoundException('Sohbet bulunamadı');
    }
    console.error(fallbackMessage, error);
    return new BadGatewayException(isUnreachable(error) ? ASSISTANT_DOWN_MESSAGE : fallbackMessage);
  }

  // Kullanıcının geçmiş sohbetlerini, en son konuşulan en üstte olacak şekilde döndürür
  static async listThreads(userId: string) {
    try {
      const { threads } = await client.listMemoryThreads({
        agentId: ASSISTANT_AGENT_ID,
        resourceId: userId,
        orderBy: { field: 'updatedAt', direction: 'DESC' },
        perPage: 100,
      });

      return await Promise.all(
        threads.map(async (thread) => ({
          id: thread.id.slice(userId.length + 1),
          title: thread.title || (await AiService.firstMessageTitle(thread.id)),
          updatedAt: new Date(thread.updatedAt).toISOString(),
          ...readFlags(thread.metadata as ThreadMetadata | null),
        })),
      );
    } catch (error) {
      console.error('Error in AiService.listThreads:', error);
      throw new BadGatewayException(
        isUnreachable(error) ? ASSISTANT_DOWN_MESSAGE : 'Sohbet geçmişi alınamadı',
      );
    }
  }

  // Mesaj metninde arama yapar; sadece kullanıcının kendi sohbetlerine bakar, eşleşen thread ID'lerini döndürür
  static async searchThreads(userId: string, query: string) {
    const needle = query.trim().toLocaleLowerCase('tr');
    if (!needle) return { ids: [] as string[] };

    try {
      const { threads } = await client.listMemoryThreads({
        agentId: ASSISTANT_AGENT_ID,
        resourceId: userId,
        perPage: 100,
      });

      const ids: string[] = [];
      // Mastra'yı yormamak için sohbetler 10'arlı gruplar halinde taranır
      for (let i = 0; i < threads.length; i += 10) {
        await Promise.all(
          threads.slice(i, i + 10).map(async (thread) => {
            const result = await client.listThreadMessages(thread.id, {
              agentId: ASSISTANT_AGENT_ID,
              perPage: 200,
            });
            const found = (result.messages as MemoryMessage[]).some(
              (message) =>
                (message.role === 'user' || message.role === 'assistant') &&
                toText(message).toLocaleLowerCase('tr').includes(needle),
            );
            if (found) ids.push(thread.id.slice(userId.length + 1));
          }),
        );
      }
      return { ids };
    } catch (error) {
      console.error('Error in AiService.searchThreads:', error);
      throw new BadGatewayException(
        isUnreachable(error) ? ASSISTANT_DOWN_MESSAGE : 'Sohbetlerde arama yapılamadı',
      );
    }
  }

  // Başlığı olmayan eski sohbetler için ilk kullanıcı mesajından başlık üretir
  private static async firstMessageTitle(memoryThreadId: string) {
    try {
      const result = await client.listThreadMessages(memoryThreadId, {
        agentId: ASSISTANT_AGENT_ID,
        orderBy: { field: 'createdAt', direction: 'ASC' },
        perPage: 5,
      });
      const messages = result.messages as MemoryMessage[];
      const first = messages.find((message) => message.role === 'user');
      return (first && toTitle(toText(first))) || 'Yeni sohbet';
    } catch {
      return 'Yeni sohbet';
    }
  }

  static async getThreadMessages(params: { threadId: string; userId: string }) {
    const memoryThreadId = AiService.memoryThreadId(params.userId, params.threadId);

    try {
      const thread = await AiService.assertOwnThread(memoryThreadId, params.userId);
      const feedback = readFeedback(thread.metadata as ThreadMetadata | null);

      const result = await client.listThreadMessages(memoryThreadId, {
        agentId: ASSISTANT_AGENT_ID,
        orderBy: { field: 'createdAt', direction: 'ASC' },
        perPage: 200,
      });
      const messages = result.messages as MemoryMessage[];

      return {
        messages: messages.filter(isVisible).map((message, index) => ({
          role: message.role as 'user' | 'assistant',
          text: toText(message),
          ...(message.role === 'assistant' && feedback[index] ? { feedback: feedback[index] } : {}),
        })),
      };
    } catch (error) {
      throw AiService.toHttpError(error, 'Sohbet yüklenemedi');
    }
  }

  // Asistan yanıtını beğenir / beğenmez; value null ise geri bildirimi kaldırır. Kilitli sohbette de verilebilir
  static async setFeedback(params: {
    userId: string;
    threadId: string;
    index: number;
    value: Feedback | null;
  }) {
    const memoryThreadId = AiService.memoryThreadId(params.userId, params.threadId);

    try {
      const thread = await AiService.assertOwnThread(memoryThreadId, params.userId);

      const result = await client.listThreadMessages(memoryThreadId, {
        agentId: ASSISTANT_AGENT_ID,
        orderBy: { field: 'createdAt', direction: 'ASC' },
        perPage: 200,
      });
      const target = (result.messages as MemoryMessage[]).filter(isVisible)[params.index];
      if (target?.role !== 'assistant') {
        throw new BadRequestException('Geri bildirim sadece asistan yanıtlarına verilebilir');
      }

      const metadata = { ...((thread.metadata as ThreadMetadata | null) ?? {}) };
      const feedback = readFeedback(metadata);
      if (params.value) feedback[params.index] = params.value;
      else delete feedback[params.index];

      if (Object.keys(feedback).length > 0) metadata['feedback'] = feedback;
      else delete metadata['feedback'];

      await client
        .getMemoryThread({ threadId: memoryThreadId, agentId: ASSISTANT_AGENT_ID })
        .update({ title: thread.title ?? '', metadata });

      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw AiService.toHttpError(error, 'Geri bildirim kaydedilemedi');
    }
  }

  // Başlığı ve/veya sabitleme, kilit, arşiv, paylaşım durumunu değiştirir
  static async updateThread(params: {
    threadId: string;
    userId: string;
    changes: {
      title?: string;
      pinned?: boolean;
      locked?: boolean;
      archived?: boolean;
      shared?: boolean;
    };
  }) {
    const { changes } = params;
    if (Object.values(changes).every((value) => value === undefined)) {
      throw new BadRequestException('Değiştirilecek bir alan belirtilmedi');
    }

    const memoryThreadId = AiService.memoryThreadId(params.userId, params.threadId);

    try {
      const thread = await AiService.assertOwnThread(memoryThreadId, params.userId);
      const metadata = { ...((thread.metadata as ThreadMetadata | null) ?? {}) };
      const flags = readFlags(metadata);

      // Kilitliyken ad değiştirilemez; kilidi açmak veya sabitleme/arşiv/paylaşım serbest
      if (flags.locked && changes.title !== undefined) throw new LockedException(LOCKED_MESSAGE);

      if (changes.pinned !== undefined) {
        metadata['pinned'] = changes.pinned;
        // Sabitlenen sohbet arşivde kalamaz
        if (changes.pinned) metadata['archived'] = false;
      }
      if (changes.archived !== undefined) {
        metadata['archived'] = changes.archived;
        // Arşive giden sohbetin sabitlemesi kalkar
        if (changes.archived) metadata['pinned'] = false;
      }
      if (changes.locked !== undefined) metadata['locked'] = changes.locked;
      if (changes.shared === true) metadata['shareToken'] = flags.shareToken ?? nanoid(32);
      if (changes.shared === false) delete metadata['shareToken'];

      const title = changes.title ?? thread.title ?? '';
      await client
        .getMemoryThread({ threadId: memoryThreadId, agentId: ASSISTANT_AGENT_ID })
        .update({ title, metadata });

      return { id: params.threadId, title, ...readFlags(metadata) };
    } catch (error) {
      throw AiService.toHttpError(error, 'Sohbet güncellenemedi');
    }
  }

  static async deleteThread(params: { threadId: string; userId: string }) {
    const memoryThreadId = AiService.memoryThreadId(params.userId, params.threadId);

    try {
      const thread = await AiService.assertOwnThread(memoryThreadId, params.userId);
      if (readFlags(thread.metadata as ThreadMetadata | null).locked) {
        throw new LockedException(LOCKED_MESSAGE);
      }

      await client
        .getMemoryThread({ threadId: memoryThreadId, agentId: ASSISTANT_AGENT_ID })
        .delete({ agentId: ASSISTANT_AGENT_ID });

      return { success: true };
    } catch (error) {
      throw AiService.toHttpError(error, 'Sohbet silinemedi');
    }
  }

  // Paylaşım linkiyle (giriş gerektirmeden) sohbeti salt okunur döndürür.
  // Sahibin kimliği ve gerçek thread id'si dışarı verilmez
  static async getSharedThread(token: string) {
    try {
      const { threads } = await client.listMemoryThreads({
        agentId: ASSISTANT_AGENT_ID,
        metadata: { shareToken: token },
        perPage: 1,
      });
      const thread = threads[0];
      if (!thread || readFlags(thread.metadata as ThreadMetadata | null).shareToken !== token) {
        throw new NotFoundException('Paylaşılan sohbet bulunamadı');
      }

      const result = await client.listThreadMessages(thread.id, {
        agentId: ASSISTANT_AGENT_ID,
        orderBy: { field: 'createdAt', direction: 'ASC' },
        perPage: 200,
      });
      const messages = result.messages as MemoryMessage[];

      return {
        title: thread.title || 'Sohbet',
        updatedAt: new Date(thread.updatedAt).toISOString(),
        messages: messages
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map((message) => ({ role: message.role as 'user' | 'assistant', text: toText(message) }))
          .filter((message) => message.text),
      };
    } catch (error) {
      throw AiService.toHttpError(error, 'Paylaşılan sohbet yüklenemedi');
    }
  }

  // Ekrandaki (görünen) mesaj listesinde `index` sırasındaki kullanıcı mesajını ve sonrasındaki her şeyi hafızadan siler.
  // Yeniden üret ve mesajı düzenle bunu kullanır; sadece kullanıcı mesajından başlanabilir
  private static async truncateFrom(params: { userId: string; threadId: string; index: number }) {
    const memoryThreadId = AiService.memoryThreadId(params.userId, params.threadId);

    try {
      const thread = await AiService.assertOwnThread(memoryThreadId, params.userId);

      const result = await client.listThreadMessages(memoryThreadId, {
        agentId: ASSISTANT_AGENT_ID,
        orderBy: { field: 'createdAt', direction: 'ASC' },
        perPage: 200,
      });
      const messages = result.messages as MemoryMessage[];

      const visible = messages.filter(isVisible);
      // Yanıt yarıda durdurulursa Mastra o mesaj çiftini kaydetmez: son sıra henüz yoksa silinecek bir şey de yoktur
      if (params.index === visible.length) return;

      const target = visible[params.index];
      if (!target || target.role !== 'user') {
        throw new BadRequestException('Silinecek mesaj bulunamadı');
      }

      const ids = messages.slice(messages.indexOf(target)).map((message) => message.id);
      const memoryThread = client.getMemoryThread({
        threadId: memoryThreadId,
        agentId: ASSISTANT_AGENT_ID,
      });
      await memoryThread.deleteMessages(ids, { agentId: ASSISTANT_AGENT_ID });

      // Silinen yanıtların geri bildirimi de silinir (yeni yanıt temiz başlar)
      const metadata = { ...((thread.metadata as ThreadMetadata | null) ?? {}) };
      const feedback = readFeedback(metadata);
      const kept = Object.fromEntries(
        Object.entries(feedback).filter(([key]) => Number(key) < params.index),
      );
      if (Object.keys(kept).length !== Object.keys(feedback).length) {
        if (Object.keys(kept).length > 0) metadata['feedback'] = kept;
        else delete metadata['feedback'];
        await memoryThread.update({ title: thread.title ?? '', metadata });
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw AiService.toHttpError(error, 'Mesajlar silinemedi');
    }
  }

  // Yanıtı parça parça döndürür. Her satır bir JSON olayıdır (NDJSON):
  // {type:'thread'} -> {type:'status'}? -> {type:'text'} ... -> {type:'done'} veya {type:'error'}
  static async chatStream(params: {
    message: string;
    threadId?: string;
    userId: string;
    truncateFrom?: number;
  }) {
    // Akış başlamadan önce kontrol edilir, böylece kilitli sohbet düzgün bir hata koduyla reddedilir
    await AiService.assertWritable(params.userId, params.threadId);

    if (params.truncateFrom !== undefined) {
      if (!params.threadId) throw new BadRequestException('Silinecek mesaj için sohbet gerekli');
      await AiService.truncateFrom({
        userId: params.userId,
        threadId: params.threadId,
        index: params.truncateFrom,
      });
    }

    const threadId = params.threadId ?? nanoid();
    const encoder = new TextEncoder();
    const abortController = new AbortController();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            // Kullanıcı sayfadan ayrıldıysa akış kapanmıştır
          }
        };

        try {
          // Yeni sohbetin başlığı ilk mesajdan gelir (başlık için ayrıca model çağrılmaz)
          if (!params.threadId) {
            await client.createMemoryThread({
              agentId: ASSISTANT_AGENT_ID,
              resourceId: params.userId,
              threadId: AiService.memoryThreadId(params.userId, threadId),
              title: toTitle(params.message),
            });
          }
          // Sohbet gerçekten oluştuktan sonra bildirilir, yoksa ekran var olmayan sohbete yönlenir
          send({ type: 'thread', threadId });

          const result = await client.getAgent(ASSISTANT_AGENT_ID).stream(params.message, {
            memory: {
              thread: AiService.memoryThreadId(params.userId, threadId),
              resource: params.userId,
            },
            abortSignal: abortController.signal,
          });

          let failed = false;
          await result.processDataStream({
            onChunk: async (chunk) => {
              if (chunk.type === 'text-delta') {
                send({ type: 'text', text: chunk.payload.text });
              } else if (chunk.type === 'tool-call') {
                send({
                  type: 'status',
                  text: TOOL_STATUS[chunk.payload.toolName] ?? 'Araç çalışıyor...',
                });
              } else if (chunk.type === 'error') {
                failed = true;
                console.error('Mastra stream error:', chunk.payload);
              }
            },
          });

          send(
            failed ? { type: 'error', message: 'Asistandan yanıt alınamadı' } : { type: 'done' },
          );
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error('Error in AiService.chatStream:', error);
            send({
              type: 'error',
              message: isUnreachable(error) ? ASSISTANT_DOWN_MESSAGE : 'Asistandan yanıt alınamadı',
            });
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Zaten kapanmış
          }
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return stream;
  }
}
