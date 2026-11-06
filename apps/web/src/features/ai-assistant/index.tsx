import { Header } from '#/components/layout/header';
import { Main } from '#/components/layout/main';
import { ProfileDropdown } from '#/components/profile-dropdown';
import { Search } from '#/components/search';
import { ThemeSwitch } from '#/components/theme-switch';
import { Button } from '#/components/ui/button';
import { Textarea } from '#/components/ui/textarea';
import { api } from '#/lib/api';
import { cn } from '#/lib/utils';
import { IconRefresh, IconSend } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

// Asistan yanıtları Markdown olarak gelir (kalın yazı, liste, kod vb.)
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-background p-3 last:mb-0 [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
};

export function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.ai.chat.post({ message, threadId });

      if (response.error) {
        throw new Error(
          (response.error.value as { message?: string })?.message ?? 'Asistandan yanıt alınamadı',
        );
      }

      return response.data as { text: string; threadId: string };
    },
    onSuccess: (data) => {
      setThreadId(data.threadId);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.text }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const send = () => {
    const message = input.trim();
    if (!message || chatMutation.isPending) return;

    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    chatMutation.mutate(message);
  };

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
    setMessages([]);
    setThreadId(undefined);
    chatMutation.reset();
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
            <h2 className="text-2xl font-bold tracking-tight">AI Asistan</h2>
            <p className="text-muted-foreground">Mastra ile çalışan asistana soru sorun.</p>
          </div>
          <Button variant="outline" onClick={resetChat} disabled={messages.length === 0}>
            <IconRefresh className="mr-2 size-4" />
            Yeni sohbet
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Sohbete başlamak için bir mesaj yazın.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                    message.role === 'user'
                      ? 'whitespace-pre-wrap bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}
                >
                  {message.role === 'user' ? (
                    message.text
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                  Yazıyor...
                </div>
              </div>
            )}

            {chatMutation.isError && (
              <p className="text-center text-sm text-destructive">{chatMutation.error.message}</p>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın... (Enter ile gönderin, Shift+Enter ile yeni satır)"
              className="max-h-40 min-h-10 resize-none"
              rows={1}
            />
            <Button type="submit" disabled={!input.trim() || chatMutation.isPending}>
              <IconSend className="size-4" />
              <span className="sr-only">Gönder</span>
            </Button>
          </form>
        </div>
      </Main>
    </>
  );
}
