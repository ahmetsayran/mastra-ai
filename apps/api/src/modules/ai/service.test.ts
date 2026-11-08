import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Mastra'nın yerine bellekte çalışan sahte bir sunucu: kurallar Mastra çalışmadan test edilir
type FakeThread = {
  id: string;
  resourceId: string;
  title: string;
  metadata: Record<string, unknown>;
  updatedAt: Date;
  messages: { id: string; role: string; content: { parts: { type: string; text: string }[] } }[];
};

const store = new Map<string, FakeThread>();
// true iken sahte Mastra kapalıymış gibi bağlantı hatası verir
let down = false;
const guard = () => {
  if (down) throw Object.assign(new TypeError('Unable to connect'), { code: 'ECONNREFUSED' });
};

const notFound = () => Object.assign(new Error('not found'), { status: 404 });

class FakeMastraClient {
  async createMemoryThread() {
    guard();
    return {};
  }

  getMemoryThread({ threadId }: { threadId: string }) {
    return {
      get: async () => {
        guard();
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
      deleteMessages: async (ids: string[]) => {
        guard();
        const thread = store.get(threadId);
        if (!thread) throw notFound();
        thread.messages = thread.messages.filter((message) => !ids.includes(message.id));
      },
      delete: async () => {
        if (!store.delete(threadId)) throw notFound();
      },
    };
  }

  async listMemoryThreads(params: { resourceId?: string; metadata?: Record<string, unknown> }) {
    guard();
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
    guard();
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
      id: `${id}#${index}`,
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

beforeEach(() => {
  store.clear();
  down = false;
});

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

describe('Mastra kapalıyken', () => {
  const DOWN_MESSAGE = 'Asistan şu an ulaşılamıyor. Birkaç dakika sonra tekrar deneyin';
  const messageOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      return { status: (error as { status?: number }).status, message: (error as Error).message };
    }
  };

  test('liste, mesajlar ve arama anlaşılır 502 döner', async () => {
    addThread('alice', 't1');
    down = true;
    const expected = { status: 502, message: DOWN_MESSAGE };

    expect(await messageOf(AiService.listThreads('alice'))).toEqual(expected);
    expect(
      await messageOf(AiService.getThreadMessages({ threadId: 't1', userId: 'alice' })),
    ).toEqual(expected);
    expect(await messageOf(AiService.searchThreads('alice', 'abc'))).toEqual(expected);
  });

  test('var olan sohbete yazma 502 döner (akış başlamadan)', async () => {
    addThread('alice', 't1');
    down = true;
    const stream = AiService.chatStream({ message: 'selam', threadId: 't1', userId: 'alice' });
    expect(await messageOf(stream)).toEqual({ status: 502, message: DOWN_MESSAGE });
  });

  test('yeni sohbette thread olayı gönderilmez, sadece hata olayı gelir', async () => {
    down = true;
    const stream = await AiService.chatStream({ message: 'selam', userId: 'alice' });
    const reader = stream.getReader();
    let output = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += new TextDecoder().decode(value);
    }
    const events = output
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events).toEqual([{ type: 'error', message: DOWN_MESSAGE }]);
  });
});

describe('yeniden üret / mesajı düzenle (truncateFrom)', () => {
  const texts = ['soru 1', 'cevap 1', 'soru 2', 'cevap 2'];
  const remaining = (id = 'alice:t1') =>
    store.get(id)?.messages.map((m) => m.content.parts[0]?.text);

  // Fake sunucuda asistan yok, akış hata olayıyla biter; burada sadece silme davranışına bakıyoruz
  const run = async (params: Parameters<typeof AiService.chatStream>[0]) => {
    const stream = await AiService.chatStream(params);
    await stream.cancel();
  };

  test('seçilen kullanıcı mesajı ve sonrası silinir, öncesi kalır', async () => {
    addThread('alice', 't1', { texts });
    await run({ message: 'soru 2', threadId: 't1', userId: 'alice', truncateFrom: 2 });
    expect(remaining()).toEqual(['soru 1', 'cevap 1']);
  });

  test('ilk mesajdan başlayınca sohbet tamamen temizlenir (düzenleme)', async () => {
    addThread('alice', 't1', { texts });
    await run({ message: 'yeni soru', threadId: 't1', userId: 'alice', truncateFrom: 0 });
    expect(remaining()).toEqual([]);
  });

  test('asistan mesajından başlanamaz (400), hiçbir şey silinmez', async () => {
    addThread('alice', 't1', { texts });
    const status = await statusOf(
      AiService.chatStream({ message: 'x', threadId: 't1', userId: 'alice', truncateFrom: 1 }),
    );
    expect(status).toBe(400);
    expect(remaining()).toEqual(texts);
  });

  test('olmayan sıra 400, sohbet id si olmadan 400 döner', async () => {
    addThread('alice', 't1', { texts });
    expect(
      await statusOf(
        AiService.chatStream({ message: 'x', threadId: 't1', userId: 'alice', truncateFrom: 99 }),
      ),
    ).toBe(400);
    expect(
      await statusOf(AiService.chatStream({ message: 'x', userId: 'alice', truncateFrom: 0 })),
    ).toBe(400);
  });

  test('henüz kaydedilmemiş son sıra (yarıda durdurulan yanıt) hata vermez, bir şey silmez', async () => {
    addThread('alice', 't1', { texts });
    await run({ message: 'soru 3', threadId: 't1', userId: 'alice', truncateFrom: 4 });
    expect(remaining()).toEqual(texts);
  });

  test('başkasının sohbetinde 404, kilitli sohbette 423 döner ve silme olmaz', async () => {
    addThread('alice', 't1', { texts });
    expect(
      await statusOf(
        AiService.chatStream({ message: 'x', threadId: 't1', userId: 'bob', truncateFrom: 0 }),
      ),
    ).toBe(404);

    store.get('alice:t1')!.metadata = { locked: true };
    expect(
      await statusOf(
        AiService.chatStream({ message: 'x', threadId: 't1', userId: 'alice', truncateFrom: 0 }),
      ),
    ).toBe(423);
    expect(remaining()).toEqual(texts);
  });
});

describe('geri bildirim (beğen / beğenme)', () => {
  const texts = ['soru 1', 'cevap 1', 'soru 2', 'cevap 2'];
  const feedbackOf = async (userId = 'alice') =>
    (await AiService.getThreadMessages({ threadId: 't1', userId })).messages.map((message) =>
      'feedback' in message ? message.feedback : undefined,
    );

  test('asistan yanıtına verilir, mesajlarla birlikte döner, null ile kalkar', async () => {
    addThread('alice', 't1', { texts });
    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 1, value: 'up' });
    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 3, value: 'down' });
    expect(await feedbackOf()).toEqual([undefined, 'up', undefined, 'down']);

    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 1, value: null });
    expect(await feedbackOf()).toEqual([undefined, undefined, undefined, 'down']);
  });

  test('kullanıcı mesajına veya olmayan sıraya verilemez (400)', async () => {
    addThread('alice', 't1', { texts });
    const give = (index: number) =>
      AiService.setFeedback({ userId: 'alice', threadId: 't1', index, value: 'up' });
    expect(await statusOf(give(0))).toBe(400);
    expect(await statusOf(give(99))).toBe(400);
  });

  test('başkasının sohbetine verilemez (404), kilitli sohbette verilebilir', async () => {
    addThread('alice', 't1', { texts });
    const bob = AiService.setFeedback({ userId: 'bob', threadId: 't1', index: 1, value: 'up' });
    expect(await statusOf(bob)).toBe(404);

    store.get('alice:t1')!.metadata = { locked: true };
    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 1, value: 'up' });
    expect(await feedbackOf()).toEqual([undefined, 'up', undefined, undefined]);
  });

  test('diğer işaretleri (kilit, sabit) silmez', async () => {
    addThread('alice', 't1', { texts, metadata: { pinned: true } });
    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 1, value: 'up' });
    expect(store.get('alice:t1')?.metadata).toMatchObject({
      pinned: true,
      feedback: { '1': 'up' },
    });
  });

  test('yeniden üretince silinen yanıtın geri bildirimi de silinir, öncekiler kalır', async () => {
    addThread('alice', 't1', { texts });
    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 1, value: 'up' });
    await AiService.setFeedback({ userId: 'alice', threadId: 't1', index: 3, value: 'down' });

    const stream = await AiService.chatStream({
      message: 'soru 2',
      threadId: 't1',
      userId: 'alice',
      truncateFrom: 2,
    });
    await stream.cancel();

    expect(store.get('alice:t1')?.metadata['feedback']).toEqual({ '1': 'up' });
  });
});
