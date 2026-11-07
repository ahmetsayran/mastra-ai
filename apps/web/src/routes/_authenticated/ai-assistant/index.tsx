import { AiAssistantPage } from '#/features/ai-assistant';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/ai-assistant/')({
  // ?thread=<id> ile geçmiş bir sohbet açılır
  validateSearch: (search: Record<string, unknown>): { thread?: string } => ({
    thread: typeof search['thread'] === 'string' ? search['thread'] : undefined,
  }),
  component: AiAssistantPage,
});
