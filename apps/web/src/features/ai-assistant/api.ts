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
export type ChatMessage = { role: 'user' | 'assistant'; text: string };

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

export type SharedThread = { title: string; updatedAt: string; messages: ChatMessage[] };

// Giriş gerektirmez: paylaşım linkindeki gizli parça ile sohbet okunur
export const fetchSharedThread = (token: string) =>
  aiFetch<SharedThread>(`/shared/${encodeURIComponent(token)}`, { credentials: 'omit' });
