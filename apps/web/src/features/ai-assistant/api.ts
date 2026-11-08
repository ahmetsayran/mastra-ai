import { env } from '#/config/env';
import { useQuery } from '@tanstack/react-query';

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  // Paylaşım açıksa linkin gizli parçası, kapalıysa null
  shareToken: string | null;
};
export type Feedback = 'up' | 'down';
// feedback: sadece asistan yanıtlarında, kullanıcı beğendi ('up') veya beğenmedi ('down') dediyse
// partial: kullanıcı yanıtı yarıda durdurdu, bu yanıt sunucuda kayıtlı değil (sadece ekranda)
export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  feedback?: Feedback;
  partial?: boolean;
};

export const THREADS_QUERY_KEY = ['ai', 'threads'] as const;

async function aiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiUrl}/ai${path}`, { credentials: 'include', ...init });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'İstek başarısız oldu');
  }

  return response.json() as Promise<T>;
}

export const fetchThreadMessages = async (threadId: string) =>
  (await aiFetch<{ messages: ChatMessage[] }>(`/threads/${encodeURIComponent(threadId)}/messages`))
    .messages;

// index: ekrandaki mesaj sırası; value null ise geri bildirim kaldırılır
export const setMessageFeedback = (threadId: string, index: number, value: Feedback | null) =>
  aiFetch<{ success: boolean }>(
    `/threads/${encodeURIComponent(threadId)}/messages/${index}/feedback`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    },
  );

// Ad, sabitleme, kilit, arşiv ve paylaşım tek istekte güncellenir; sadece verilen alanlar değişir
export type ChatThreadPatch = Partial<{
  title: string;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  shared: boolean;
}>;

export const updateThread = (threadId: string, patch: ChatThreadPatch) =>
  aiFetch<Pick<ChatThread, 'id' | 'title' | 'pinned' | 'locked' | 'archived' | 'shareToken'>>(
    `/threads/${encodeURIComponent(threadId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  );

export const deleteThread = (threadId: string) =>
  aiFetch<{ success: boolean }>(`/threads/${encodeURIComponent(threadId)}`, { method: 'DELETE' });

// Geçmiş sohbetler: sidebar bunu gösterir, sohbet sayfası yeni mesajdan sonra yeniler
export const useThreads = () =>
  useQuery({
    queryKey: THREADS_QUERY_KEY,
    queryFn: async () => (await aiFetch<{ threads: ChatThread[] }>('/threads')).threads,
  });

// Mesaj içeriğinde arama: eşleşen sohbetlerin thread ID'leri gelir (en az 2 harf)
export const useMessageSearch = (query: string) =>
  useQuery({
    queryKey: [...THREADS_QUERY_KEY, 'search', query],
    queryFn: async () =>
      (await aiFetch<{ ids: string[] }>(`/threads/search?q=${encodeURIComponent(query)}`)).ids,
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

export type SharedThread = { title: string; updatedAt: string; messages: ChatMessage[] };

// Giriş gerektirmez: paylaşım linkindeki gizli parça ile sohbet okunur
export const fetchSharedThread = (token: string) =>
  aiFetch<SharedThread>(`/shared/${encodeURIComponent(token)}`, { credentials: 'omit' });
