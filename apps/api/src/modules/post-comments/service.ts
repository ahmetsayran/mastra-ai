import prisma from '@onlyjs/db';
import { ForbiddenException, NotFoundException } from '../../utils';
import type { PaginationQuery } from '../../utils/pagination';
import type { PostCommentCreatePayload, PostCommentUpdatePayload } from './types';

const include = {
  post: { select: { uuid: true } },
  author: { select: { id: true, name: true } },
};

export abstract class PostCommentsService {
  static async index(query: PaginationQuery & { postUuid: string }) {
    const { page = 1, perPage = 20, postUuid } = query;

    const post = await prisma.post.findUnique({ where: { uuid: postUuid }, select: { id: true } });
    if (!post) throw new NotFoundException('Gönderi bulunamadı');

    const where = { postId: post.id };
    const [data, total] = await Promise.all([
      prisma.postComment.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include,
      }),
      prisma.postComment.count({ where }),
    ]);

    return { data, total };
  }

  static async show(uuid: string) {
    const comment = await prisma.postComment.findUnique({ where: { uuid }, include });
    if (!comment) throw new NotFoundException('Yorum bulunamadı');
    return comment;
  }

  static async store(data: PostCommentCreatePayload, authorId: string) {
    const post = await prisma.post.findUnique({
      where: { uuid: data.postUuid },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Gönderi bulunamadı');

    return prisma.postComment.create({
      data: { content: data.content, postId: post.id, authorId },
      include,
    });
  }

  static async update(uuid: string, data: PostCommentUpdatePayload, userId: string) {
    await PostCommentsService.assertOwner(uuid, userId);
    return prisma.postComment.update({ where: { uuid }, data, include });
  }

  static async destroy(uuid: string, userId: string) {
    await PostCommentsService.assertOwner(uuid, userId);
    return prisma.postComment.delete({ where: { uuid }, include });
  }

  // Yorumu sadece yazan kişi değiştirebilir veya silebilir
  private static async assertOwner(uuid: string, userId: string) {
    const comment = await PostCommentsService.show(uuid);
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Bu yorumu sadece yazan kişi değiştirebilir');
    }
  }
}
