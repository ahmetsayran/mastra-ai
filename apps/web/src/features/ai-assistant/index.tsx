import { Header } from '#/components/layout/header';
import { Main } from '#/components/layout/main';
import { ProfileDropdown } from '#/components/profile-dropdown';
import { Search } from '#/components/search';
import { ThemeSwitch } from '#/components/theme-switch';
import { Button } from '#/components/ui/button';
import { Textarea } from '#/components/ui/textarea';
import { env } from '#/config/env';
import {
  IconDownload,
  IconLock,
  IconPlayerStopFilled,
  IconRefresh,
  IconSend,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { type ChatMessage, THREADS_QUERY_KEY, fetchThreadMessages, useThreads } from './api';
import { ChatBubble } from './chat-bubble';

export function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>();
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Şu an ekranda açık olan sohbet (URL'deki ?thread= ile eşleşir)
  const activeThreadRef = useRef<string>();
  // Eski bir yükleme geç biterse yeni sohbetin ekranını ezmesin diye her yüklemeye numara verilir
  const loadIdRef = useRef(0);

  const { thread } = useSearch({ from: '/_authenticated/ai-assistant/' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: threads } = useThreads();
  // Kilitli sohbete yeni mesaj yazılamaz (kilit soldaki "..." menüsünden açılır)
  const isLocked = !!threadId && !!threads?.find((thread) => thread.id === threadId)?.locked;

  // Sayfadan ayrılınca süren yanıtı iptal et
  useEffect(() => () => abortRef.current?.abort(), []);

  // Sidebar'dan başka bir sohbet seçilince (URL değişince) o sohbetin mesajlarını yükle
  useEffect(() => {
    // Yeni sohbetin id'si URL'ye yazıldığında zaten o sohbetteyiz, tekrar yüklemeye gerek yok
    if (thread === activeThreadRef.current) return;

    abortRef.current?.abort();
    loadIdRef.current += 1;
    activeThreadRef.current = thread;
    setThreadId(thread);
    setError(undefined);
    setIsStreaming(false);

    if (!thread) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    const loadId = ++loadIdRef.current;
    const isCurrent = () => loadId === loadIdRef.current;

    setIsLoadingHistory(true);
    fetchThreadMessages(thread)
      .then((history) => isCurrent() && setMessages(history))
      .catch((err: unknown) => {
        if (!isCurrent()) return;
        setMessages([]);
        setError(err instanceof Error ? err.message : 'Sohbet yüklenemedi');
      })
      .finally(() => isCurrent() && setIsLoadingHistory(false));
  }, [thread]);

  // Yanıt parça parça gelir: her satır bir JSON olayıdır (thread, text, done, error)
  const streamReply = async (message: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    setError(undefined);

    const appendToLast = (text: string) =>
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      });

    try {
      const response = await fetch(`${env.apiUrl}/ai/chat/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, threadId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? 'Asistandan yanıt alınamadı');
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: 'thread'; threadId: string }
            | { type: 'text'; text: string }
            | { type: 'done' }
            | { type: 'error'; message: string };

          if (event.type === 'thread') {
            // Yeni sohbetin id'sini URL'ye yaz, sayfa yenilense de aynı sohbet açılsın
            activeThreadRef.current = event.threadId;
            setThreadId(event.threadId);
            void navigate({
              to: '/ai-assistant',
              search: { thread: event.threadId },
              replace: true,
            });
          } else if (event.type === 'text') appendToLast(event.text);
          else if (event.type === 'error') throw new Error(event.message);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Asistandan yanıt alınamadı');
    } finally {
      // Bu arada başka sohbete geçildiyse yeni sohbetin ekranına dokunma
      if (abortRef.current === controller) {
        void queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
        // Boş kalan asistan balonunu kaldır
        setMessages((prev) =>
          prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1].text
            ? prev.slice(0, -1)
            : prev,
        );
        setIsStreaming(false);
      }
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const send = () => {
    const message = input.trim();
    if (!message || isStreaming || isLocked) return;

    // Asistan balonu boş başlar, yanıt geldikçe dolar
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: message },
      { role: 'assistant', text: '' },
    ]);
    setInput('');
    void streamReply(message);
  };

  // Ekrandaki sohbeti .md dosyası olarak indirir (tarayıcıda oluşturulur, sunucuya gitmez)
  const exportMarkdown = () => {
    const title = threads?.find((item) => item.id === threadId)?.title ?? 'Sohbet';
    const body = messages
      .filter((message) => message.text)
      .map(
        (message) => `## ${message.role === 'user' ? 'Kullanıcı' : 'Asistan'}\n\n${message.text}`,
      )
      .join('\n\n');
    const blob = new Blob([`# ${title}\n\n${body}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'sohbet'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Süren yanıtı yarıda keser; o ana kadar gelen metin ekranda kalır
  const stop = () => abortRef.current?.abort();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const resetChat = () => {
    abortRef.current?.abort();
    activeThreadRef.current = undefined;
    setMessages([]);
    setThreadId(undefined);
    setError(undefined);
    setIsStreaming(false);
    void navigate({ to: '/ai-assistant', search: {} });
  };

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              AI Asistan
              {isLocked && (
                <IconLock className="size-5 text-muted-foreground" aria-label="Kilitli" />
              )}
            </h2>
            <p className="text-muted-foreground">Mastra ile çalışan asistana soru sorun.</p>
            {threadId && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">Thread ID: {threadId}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportMarkdown}
              disabled={messages.length === 0 || isStreaming}
            >
              <IconDownload className="mr-2 size-4" />
              Markdown indir
            </Button>
            <Button variant="outline" onClick={resetChat} disabled={messages.length === 0}>
              <IconRefresh className="mr-2 size-4" />
              Yeni sohbet
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">
                  {isLoadingHistory
                    ? 'Sohbet yükleniyor...'
                    : 'Sohbete başlamak için bir mesaj yazın.'}
                </p>
              </div>
            )}

            {messages.map((message, index) =>
              message.role === 'assistant' && !message.text ? null : (
                <ChatBubble key={index} message={message} />
              ),
            )}

            {isStreaming && !messages[messages.length - 1]?.text && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                  Yazıyor...
                </div>
              </div>
            )}

            {error && <p className="text-center text-sm text-destructive">{error}</p>}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isLocked
                  ? 'Bu sohbet kilitli. Yazmak için kilidi açın (soldaki "..." menüsü)'
                  : 'Mesajınızı yazın... (Enter ile gönderin, Shift+Enter ile yeni satır)'
              }
              className="max-h-40 min-h-10 resize-none"
              rows={1}
              disabled={isLocked}
            />
            {isStreaming ? (
              <Button type="button" variant="outline" onClick={stop}>
                <IconPlayerStopFilled className="size-4" />
                <span className="sr-only">Durdur</span>
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim() || isLocked}>
                <IconSend className="size-4" />
                <span className="sr-only">Gönder</span>
              </Button>
            )}
          </form>
        </div>
      </Main>
    </>
  );
}
