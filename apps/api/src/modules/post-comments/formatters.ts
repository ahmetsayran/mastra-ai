import type { Post, PostComment } from '@onlyjs/db/client';
import { BaseFormatter } from '../../utils/base-formatter';
import { postCommentResponseDto } from './dtos';
import type { PostCommentResponse } from './types';

export abstract class PostCommentFormatter {
  static response(
    data: PostComment & { post: Pick<Post, 'uuid'>; author: { id: string; name: string } },
  ) {
    return BaseFormatter.convertData<PostCommentResponse>(
      {
        ...data,
        postUuid: data.post.uuid,
        author: { id: data.author.id, name: data.author.name },
      },
      postCommentResponseDto,
    );
  }
}
