import { Elysia } from 'elysia';
import { auth } from '../auth';
import {
  aiChatDto,
  aiChatStreamDto,
  aiMessageFeedbackDto,
  aiSharedThreadDto,
  aiThreadDeleteDto,
  aiThreadMessagesDto,
  aiThreadSearchDto,
  aiThreadUpdateDto,
  aiThreadsDto,
} from './dtos';
import { AiService } from './service';

const app = new Elysia({ prefix: '/ai', tags: ['AI'] })
  .use(auth())
  .post(
    '/chat',
    async ({ body, user, request }) =>
      AiService.chat({
        ...body,
        userId: user.id,
        cookie: request.headers.get('cookie') ?? undefined,
      }),
    aiChatDto,
  )
  .post(
    '/chat/stream',
    async ({ body, user, request }) =>
      new Response(
        await AiService.chatStream({
          ...body,
          userId: user.id,
          cookie: request.headers.get('cookie') ?? undefined,
        }),
        {
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
          },
        },
      ),
    aiChatStreamDto,
  )
  .get(
    '/threads',
    async ({ user }) => ({ threads: await AiService.listThreads(user.id) }),
    aiThreadsDto,
  )
  .get(
    '/threads/search',
    async ({ query, user }) => AiService.searchThreads(user.id, query.q),
    aiThreadSearchDto,
  )
  .get(
    '/threads/:threadId/messages',
    async ({ params, user }) =>
      AiService.getThreadMessages({ threadId: params.threadId, userId: user.id }),
    aiThreadMessagesDto,
  )
  .put(
    '/threads/:threadId/messages/:index/feedback',
    async ({ params, body, user }) =>
      AiService.setFeedback({
        threadId: params.threadId,
        userId: user.id,
        index: params.index,
        value: body.value,
      }),
    aiMessageFeedbackDto,
  )
  .patch(
    '/threads/:threadId',
    async ({ params, body, user }) =>
      AiService.updateThread({
        threadId: params.threadId,
        userId: user.id,
        changes: { ...body, title: body.title?.trim() },
      }),
    aiThreadUpdateDto,
  )
  .delete(
    '/threads/:threadId',
    async ({ params, user }) =>
      AiService.deleteThread({ threadId: params.threadId, userId: user.id }),
    aiThreadDeleteDto,
  );

// Giriş gerektirmez: paylaşım linkine sahip herkes sohbeti okuyabilir
export const aiSharedController = new Elysia({ prefix: '/ai/shared', tags: ['AI'] }).get(
  '/:token',
  async ({ params }) => AiService.getSharedThread(params.token),
  aiSharedThreadDto,
);

export default app;
