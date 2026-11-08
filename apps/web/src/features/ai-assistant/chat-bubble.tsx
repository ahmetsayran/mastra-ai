import { cn } from '#/lib/utils';
import {
  IconCheck,
  IconCopy,
  IconPencil,
  IconRefresh,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
} from '@tabler/icons-react';
import { type ReactNode, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { ChatMessage, Feedback } from './api';

// Kod bloğu: sağ üstteki buton bloğun metnini panoya kopyalar
function CodeBlock({ children }: { children?: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.innerText ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kopyalanamadı');
    }
  };

  return (
    <div className="group relative mb-2 last:mb-0">
      <pre
        ref={preRef}
        className="overflow-x-auto rounded bg-background p-3 [&>code]:bg-transparent [&>code]:p-0"
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Kodu kopyala"
        className="absolute top-2 right-2 rounded border bg-background p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
      </button>
    </div>
  );
}

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
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
};

// Sohbet balonu: kullanıcı mesajı düz metin, asistan yanıtı Markdown olarak gösterilir.
// onEdit: kullanıcı mesajını düzenle (üzerine gelince çıkar), onRegenerate: son asistan yanıtını yeniden üret,
// onFeedback: asistan yanıtını beğen / beğenme (aynı butona tekrar basınca geri alınır)
export function ChatBubble({
  message,
  onEdit,
  onRegenerate,
  onFeedback,
}: {
  message: ChatMessage;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (value: Feedback | null) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group flex max-w-[80%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser ? 'whitespace-pre-wrap bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {isUser ? (
            message.text
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.text}
            </ReactMarkdown>
          )}
        </div>

        {isUser && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          >
            <IconPencil className="size-3.5" />
            Düzenle
          </button>
        )}
        {!isUser && (onFeedback || onRegenerate) && (
          <div className="flex items-center gap-3 text-muted-foreground">
            {onFeedback && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Beğen"
                  aria-pressed={message.feedback === 'up'}
                  onClick={() => onFeedback(message.feedback === 'up' ? null : 'up')}
                  className="hover:text-foreground"
                >
                  {message.feedback === 'up' ? (
                    <IconThumbUpFilled className="size-3.5 text-foreground" />
                  ) : (
                    <IconThumbUp className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Beğenme"
                  aria-pressed={message.feedback === 'down'}
                  onClick={() => onFeedback(message.feedback === 'down' ? null : 'down')}
                  className="hover:text-foreground"
                >
                  {message.feedback === 'down' ? (
                    <IconThumbDownFilled className="size-3.5 text-foreground" />
                  ) : (
                    <IconThumbDown className="size-3.5" />
                  )}
                </button>
              </div>
            )}
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1 text-xs hover:text-foreground"
              >
                <IconRefresh className="size-3.5" />
                Yeniden üret
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
