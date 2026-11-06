import { t } from 'elysia';
import { type ControllerHook, errorResponseDto } from '../../utils';

export const aiChatDto = {
  body: t.Object({
    message: t.String({ minLength: 1, maxLength: 4000 }),
    threadId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  }),
  response: {
    200: t.Object({
      text: t.String(),
      threadId: t.String(),
    }),
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Chat',
    description: 'Mastra asistanına mesaj gönderir ve yanıtını döndürür',
  },
} satisfies ControllerHook;
