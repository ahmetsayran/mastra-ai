import { SharedChatPage } from '#/features/shared-chat';
import { createFileRoute } from '@tanstack/react-router';

// Giriş gerektirmeyen, paylaşım linkiyle açılan sayfa
export const Route = createFileRoute('/shared/$token')({
  component: SharedChatPage,
});
