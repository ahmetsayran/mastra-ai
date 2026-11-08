import { cn } from '#/lib/utils';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { type ReactNode, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import type { ChatMessage } from './api';

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

// Sohbet balonu: kullanıcı mesajı düz metin, asistan yanıtı Markdown olarak gösterilir
export function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
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
  );
}
