import { Elysia } from 'elysia';
import { auth } from '../auth';
import { aiChatDto } from './dtos';
import { AiService } from './service';

const app = new Elysia({ prefix: '/ai', tags: ['AI'] })
  .use(auth())
  .post('/chat', async ({ body, user }) => AiService.chat({ ...body, userId: user.id }), aiChatDto);

export default app;
