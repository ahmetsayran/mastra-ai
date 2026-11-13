import { beforeEach, describe, expect, mock, test } from 'bun:test';

// Gerçek veritabanı yerine bellekte tek bir yorum tutan sahte Prisma
const comment = {
  id: 1,
  uuid: 'c1',
  content: 'Merhaba',
  postId: 1,
  authorId: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
  post: { uuid: 'p1' },
  author: { id: 'owner', name: 'Sahip' },
};
let stored: typeof comment | null;

const prisma = {
  post: {
    findUnique: async ({ where }: { where: { uuid: string } }) =>
      where.uuid === 'p1' ? { id: 1 } : null,
  },
  postComment: {
    findUnique: async () => stored,
    update: async ({ data }: { data: { content: string } }) => ({ ...comment, ...data }),
    delete: async () => {
      const removed = stored;
      stored = null;
      return removed;
    },
    create: async ({ data }: { data: { content: string; authorId: string } }) => ({
      ...comment,
      ...data,
    }),
  },
};
mock.module('@onlyjs/db', () => ({ default: prisma }));

const { PostCommentsService } = await import('./service');

beforeEach(() => {
  stored = { ...comment };
});

describe('PostCommentsService', () => {
  test('yorum sahibi düzenleyebilir ve silebilir', async () => {
    const updated = await PostCommentsService.update('c1', { content: 'Yeni' }, 'owner');
    expect(updated.content).toBe('Yeni');

    await PostCommentsService.destroy('c1', 'owner');
    expect(stored).toBeNull();
  });

  test('başkasının yorumu düzenlenemez ve silinemez', async () => {
    await expect(PostCommentsService.update('c1', { content: 'Hack' }, 'other')).rejects.toThrow(
      'yazan kişi',
    );
    await expect(PostCommentsService.destroy('c1', 'other')).rejects.toThrow('yazan kişi');
    expect(stored).not.toBeNull();
  });

  test('olmayan yorum veya gönderi için 404', async () => {
    stored = null;
    await expect(PostCommentsService.update('c1', { content: 'x' }, 'owner')).rejects.toThrow(
      'Yorum bulunamadı',
    );
    await expect(
      PostCommentsService.store({ postUuid: 'yok', content: 'x' }, 'owner'),
    ).rejects.toThrow('Gönderi bulunamadı');
  });

  test('yorum, giriş yapan kullanıcı adına oluşur', async () => {
    const created = await PostCommentsService.store({ postUuid: 'p1', content: 'Selam' }, 'u9');
    expect(created.authorId).toBe('u9');
  });
});
