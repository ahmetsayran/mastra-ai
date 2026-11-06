import { AiAssistantPage } from '#/features/ai-assistant';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/ai-assistant/')({
  component: AiAssistantPage,
});
