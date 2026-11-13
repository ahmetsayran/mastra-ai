import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  createPostCommentTool,
  deletePostCommentTool,
  listPostCommentsTool,
  updatePostCommentTool,
} from './post-comment-tools';

const withCookie = (cookie?: string) => ({
  requestContext: { get: (key: string) => (key === 'cookie' ? cookie : undefined) },
});

const apiComment = {
  uuid: 'c1',
  content: 'Merhaba',
  postUuid: 'p1',
  author: { id: 'u1', name: 'Ahmet' },
  createdAt: '2026-11-11T10:00:00.000Z',
};

let fetchMock: ReturnType<typeof spyOn>;
const respond = (status: number, body: unknown) => {
  fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  );
};

afterEach(() => fetchMock?.mockRestore());

describe('post comment tools', () => {
  test('oturum çerezini API isteğine ekler', async () => {
    respond(200, { data: [apiComment], meta: { total: 1 } });

    const result = await listPostCommentsTool.execute?.(
      { postUuid: 'p1' },
      withCookie('a=b') as never,
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/post-comments?postUuid=p1');
    expect((init.headers as Record<string, string>).cookie).toBe('a=b');
    expect(result).toMatchObject({ total: 1, comments: [{ uuid: 'c1', author: 'Ahmet' }] });
  });

  test('çerez yoksa API çağrılmaz', async () => {
    respond(200, {});

    await expect(
      listPostCommentsTool.execute?.({ postUuid: 'p1' }, withCookie() as never),
    ).rejects.toThrow('Oturum bilgisi');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('oluşturma gövdeyi POST olarak gönderir', async () => {
    respond(200, apiComment);

    await createPostCommentTool.execute?.(
      { postUuid: 'p1', content: 'Merhaba' },
      withCookie('a=b') as never,
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ postUuid: 'p1', content: 'Merhaba' });
  });

  test('güncelleme PUT, silme DELETE kullanır', async () => {
    respond(200, apiComment);
    await updatePostCommentTool.execute?.(
      { commentUuid: 'c1', content: 'Yeni' },
      withCookie('a=b') as never,
    );
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe('PUT');
    fetchMock.mockRestore();

    respond(200, { message: 'Yorum başarıyla silindi' });
    await deletePostCommentTool.execute?.({ commentUuid: 'c1' }, withCookie('a=b') as never);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toEndWith('/post-comments/c1');
    expect(init.method).toBe('DELETE');
  });

  test('API hata mesajını aynen iletir (başkasının yorumu)', async () => {
    respond(403, { name: 'ForbiddenError', message: 'Bu yorumu sadece yazan kişi değiştirebilir' });

    await expect(
      deletePostCommentTool.execute?.({ commentUuid: 'c1' }, withCookie('a=b') as never),
    ).rejects.toThrow('sadece yazan kişi');
  });
});
