import { Elysia } from 'elysia';
import { PaginationService } from '../../utils/pagination';
import { auth } from '../auth';
import {
  postCommentCreateDto,
  postCommentDestroyDto,
  postCommentIndexDto,
  postCommentShowDto,
  postCommentUpdateDto,
} from './dtos';
import { PostCommentFormatter } from './formatters';
import { PostCommentsService } from './service';

const app = new Elysia({ prefix: '/post-comments', tags: ['Post Comment'] })
  .get(
    '/',
    async ({ query }) => {
      const { data, total } = await PostCommentsService.index(query);
      return PaginationService.createPaginatedResponse({
        data,
        total,
        query,
        formatter: PostCommentFormatter.response,
      });
    },
    postCommentIndexDto,
  )
  .get(
    '/:uuid',
    async ({ params }) =>
      PostCommentFormatter.response(await PostCommentsService.show(params.uuid)),
    postCommentShowDto,
  )
  // Yazma işlemleri için giriş yeterli; değiştirme ve silme sadece yorum sahibine açık (service içinde kontrol edilir)
  .use(auth())
  .post(
    '/',
    async ({ body, user }) =>
      PostCommentFormatter.response(await PostCommentsService.store(body, user.id)),
    postCommentCreateDto,
  )
  .put(
    '/:uuid',
    async ({ params, body, user }) =>
      PostCommentFormatter.response(await PostCommentsService.update(params.uuid, body, user.id)),
    postCommentUpdateDto,
  )
  .delete(
    '/:uuid',
    async ({ params, user }) => {
      await PostCommentsService.destroy(params.uuid, user.id);
      return { message: 'Yorum başarıyla silindi' };
    },
    postCommentDestroyDto,
  );

export default app;
