import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Mastra'nın yerine bellekte çalışan sahte bir sunucu: kurallar Mastra çalışmadan test edilir
type FakeThread = {
  id: string;
  resourceId: string;
  title: string;
  metadata: Record<string, unknown>;
  updatedAt: Date;
  messages: { role: string; content: { parts: { type: string; text: string }[] } }[];
};

const store = new Map<string, FakeThread>();

const notFound = () => Object.assign(new Error('not found'), { status: 404 });

class FakeMastraClient {
  getMemoryThread({ threadId }: { threadId: string }) {
    return {
      get: async () => {
        const thread = store.get(threadId);
        if (!thread) throw notFound();
        return thread;
      },
      update: async ({ title, metadata }: { title: string; metadata: Record<string, unknown> }) => {
        const thread = store.get(threadId);
        if (!thread) throw notFound();
        // Gerçek Mastra gibi metadata'nın üzerine yazar
        Object.assign(thread, { title, metadata });
      },
      delete: async () => {
        if (!store.delete(threadId)) throw notFound();
      },
    };
  }

  async listMemoryThreads(params: { resourceId?: string; metadata?: Record<string, unknown> }) {
    const threads = [...store.values()].filter(
      (thread) =>
        (!params.resourceId || thread.resourceId === params.resourceId) &&
        Object.entries(params.metadata ?? {}).every(
          ([key, value]) => thread.metadata[key] === value,
        ),
    );
    return { threads };
  }

  async listThreadMessages(threadId: string) {
    const thread = store.get(threadId);
    if (!thread) throw notFound();
    return { messages: thread.messages };
  }
}

mock.module('@mastra/client-js', () => ({ MastraClient: FakeMastraClient }));

const { AiService } = await import('./service');

const addThread = (
  userId: string,
  threadId: string,
  options: { title?: string; metadata?: Record<string, unknown>; texts?: string[] } = {},
) => {
  const id = `${userId}:${threadId}`;
  store.set(id, {
    id,
    resourceId: userId,
    title: options.title ?? 'Başlık',
    metadata: options.metadata ?? {},
    updatedAt: new Date(),
    messages: (options.texts ?? []).map((text, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: { parts: [{ type: 'text', text }] },
    })),
  });
};

// Hata fırlatan çağrının HTTP durum kodunu döndürür (hata yoksa undefined)
const statusOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as { status?: number }).status;
  }
};

beforeEach(() => store.clear());

describe('yetki: başkasının sohbeti', () => {
  test('mesajlarını okuma 404 döner', async () => {
    addThread('alice', 't1', { texts: ['gizli'] });
    expect(await statusOf(AiService.getThreadMessages({ threadId: 't1', userId: 'bob' }))).toBe(
      404,
    );
  });

  test('güncelleme ve silme 404 döner, sohbet yerinde kalır', async () => {
    addThread('alice', 't1');
    const update = AiService.updateThread({
      threadId: 't1',
      userId: 'bob',
      changes: { title: 'ele geçirildi' },
    });
    expect(await statusOf(update)).toBe(404);
    expect(await statusOf(AiService.deleteThread({ threadId: 't1', userId: 'bob' }))).toBe(404);
    expect(store.get('alice:t1')?.title).toBe('Başlık');
  });

  test('id eşleşse bile resourceId başkasınınsa 404 döner (ikinci savunma)', async () => {
    // "bob:t1" anahtarı var ama sahibi alice: id ayrıştırması atlatılsa bile erişim engellenmeli
    addThread('alice', 't1');
    store.set('bob:t1', { ...(store.get('alice:t1') as FakeThread), id: 'bob:t1' });

    expect(await statusOf(AiService.getThreadMessages({ threadId: 't1', userId: 'bob' }))).toBe(
      404,
    );
    expect(await statusOf(AiService.deleteThread({ threadId: 't1', userId: 'bob' }))).toBe(404);
  });

  test('liste sadece kendi sohbetlerini içerir', async () => {
    addThread('alice', 't1');
    addThread('bob', 't2');
    const list = await AiService.listThreads('alice');
    expect(list.map((thread) => thread.id)).toEqual(['t1']);
  });
});

describe('kilit', () => {
  test('kilitli sohbette ad değiştirme 423 döner', async () => {
    addThread('alice', 't1', { metadata: { locked: true } });
    const rename = AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { title: 'yeni' },
    });
    expect(await statusOf(rename)).toBe(423);
  });

  test('kilitli sohbet silinemez, kilit açılınca silinir', async () => {
    addThread('alice', 't1', { metadata: { locked: true } });
    expect(await statusOf(AiService.deleteThread({ threadId: 't1', userId: 'alice' }))).toBe(423);
    expect(store.has('alice:t1')).toBe(true);

    await AiService.updateThread({ threadId: 't1', userId: 'alice', changes: { locked: false } });
    await AiService.deleteThread({ threadId: 't1', userId: 'alice' });
    expect(store.has('alice:t1')).toBe(false);
  });

  test('kilitli sohbete yeni mesaj gönderme 423 döner (akış başlamadan)', async () => {
    addThread('alice', 't1', { metadata: { locked: true } });
    const stream = AiService.chatStream({ message: 'selam', threadId: 't1', userId: 'alice' });
    expect(await statusOf(stream)).toBe(423);
  });

  test('kilitliyken sabitleme ve arşiv serbest', async () => {
    addThread('alice', 't1', { metadata: { locked: true } });
    const result = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { pinned: true },
    });
    expect(result).toMatchObject({ pinned: true, locked: true });
  });
});

describe('sabitle, arşivle, paylaş', () => {
  test('boş değişiklik 400 döner', async () => {
    addThread('alice', 't1');
    expect(
      await statusOf(AiService.updateThread({ threadId: 't1', userId: 'alice', changes: {} })),
    ).toBe(400);
  });

  test('sabitlenen arşivden çıkar, arşivlenenin sabitlemesi kalkar', async () => {
    addThread('alice', 't1', { metadata: { archived: true } });
    const pinned = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { pinned: true },
    });
    expect(pinned).toMatchObject({ pinned: true, archived: false });

    const archived = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { archived: true },
    });
    expect(archived).toMatchObject({ pinned: false, archived: true });
  });

  test('bir alanı değiştirmek diğer işaretleri silmez (metadata birleştirilir)', async () => {
    addThread('alice', 't1', { metadata: { pinned: true } });
    const result = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { locked: true },
    });
    expect(result).toMatchObject({ pinned: true, locked: true });
  });

  test('paylaşım token üretir, tekrar açınca aynı kalır, kapatınca silinir', async () => {
    addThread('alice', 't1', { texts: ['merhaba', 'selam'] });
    const first = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { shared: true },
    });
    expect(first.shareToken).toHaveLength(32);

    const again = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { shared: true },
    });
    expect(again.shareToken).toBe(first.shareToken as string);

    const off = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { shared: false },
    });
    expect(off.shareToken).toBeNull();
  });

  test('paylaşılan sohbet token ile okunur, sahibini ve gerçek id yi sızdırmaz', async () => {
    addThread('alice', 't1', { texts: ['merhaba', 'selam'] });
    const { shareToken } = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { shared: true },
    });

    const shared = await AiService.getSharedThread(shareToken as string);
    expect(shared.messages).toEqual([
      { role: 'user', text: 'merhaba' },
      { role: 'assistant', text: 'selam' },
    ]);
    expect(Object.keys(shared).sort()).toEqual(['messages', 'title', 'updatedAt']);
  });

  test('yanlış veya kapatılmış token 404 döner', async () => {
    addThread('alice', 't1');
    expect(await statusOf(AiService.getSharedThread('x'.repeat(32)))).toBe(404);

    const { shareToken } = await AiService.updateThread({
      threadId: 't1',
      userId: 'alice',
      changes: { shared: true },
    });
    await AiService.updateThread({ threadId: 't1', userId: 'alice', changes: { shared: false } });
    expect(await statusOf(AiService.getSharedThread(shareToken as string))).toBe(404);
  });
});

describe('mesaj içinde arama', () => {
  test('büyük/küçük harf fark etmez ve Türkçe harfleri tanır', async () => {
    addThread('alice', 't1', { texts: ['Işık hızı nedir?', 'Yaklaşık 300.000 km/s'] });
    addThread('alice', 't2', { texts: ['başka konu', 'alakasız'] });

    expect((await AiService.searchThreads('alice', 'IŞIK')).ids).toEqual(['t1']);
    expect((await AiService.searchThreads('alice', 'km/s')).ids).toEqual(['t1']);
    expect((await AiService.searchThreads('alice', 'yok böyle')).ids).toEqual([]);
  });

  test('başkasının sohbetlerinde arama yapmaz', async () => {
    addThread('bob', 't9', { texts: ['gizli kelime'] });
    expect((await AiService.searchThreads('alice', 'gizli')).ids).toEqual([]);
  });
});
