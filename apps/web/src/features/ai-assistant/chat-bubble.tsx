import { cn } from '#/lib/utils';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './api';

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
