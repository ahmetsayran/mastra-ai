import { ThemeSwitch } from '#/components/theme-switch';
import { type ChatMessage, fetchSharedThread } from '#/features/ai-assistant/api';
import { ChatBubble } from '#/features/ai-assistant/chat-bubble';
import { IconShare } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/shared/$token');

// Paylaşım linkini açan herkesin (giriş yapmadan) gördüğü salt okunur sohbet sayfası
export function SharedChatPage() {
  const { token } = route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai', 'shared', token],
    queryFn: () => fetchSharedThread(token),
    retry: false,
  });

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconShare className="size-3.5" />
            Paylaşılan sohbet (salt okunur)
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{data?.title ?? 'Sohbet'}</h1>
        </div>
        <ThemeSwitch />
      </header>

      <main className="flex flex-1 flex-col gap-4 rounded-lg border p-4">
        {isLoading && <p className="m-auto text-muted-foreground">Sohbet yükleniyor...</p>}
        {isError && (
          <p className="m-auto text-center text-muted-foreground">
            Bu sohbet bulunamadı. Paylaşım kapatılmış veya link yanlış olabilir.
          </p>
        )}
        {data?.messages.map((message: ChatMessage, index) => (
          <ChatBubble key={index} message={message} />
        ))}
      </main>
    </div>
  );
}
