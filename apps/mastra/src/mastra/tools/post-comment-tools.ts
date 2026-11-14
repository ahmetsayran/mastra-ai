import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { callApi } from './api-client';

type Paginated<T> = { data: T[]; meta: { total: number } };
type ApiComment = {
  uuid: string;
  content: string;
  postUuid: string;
  author: { name: string };
  createdAt: string;
};

const commentSchema = z.object({
  uuid: z.string(),
  content: z.string(),
  postUuid: z.string(),
  author: z.string(),
  createdAt: z.string(),
});

const toComment = (c: ApiComment) => ({
  uuid: c.uuid,
  content: c.content,
  postUuid: c.postUuid,
  author: c.author.name,
  createdAt: String(c.createdAt),
});

export const listPostCommentsTool = createTool({
  id: 'list_post_comments',
  description: 'Lists the comments of a post, newest first.',
  inputSchema: z.object({ postUuid: z.string().describe('Post uuid.') }),
  outputSchema: z.object({ total: z.number(), comments: z.array(commentSchema) }),
  execute: async ({ postUuid }, { requestContext }) => {
    const query = new URLSearchParams({ postUuid, perPage: '20' });
    const result = await callApi<Paginated<ApiComment>>(
      requestContext,
      'GET',
      `/post-comments?${query}`,
    );
    return { total: result.meta.total, comments: result.data.map(toComment) };
  },
});

export const createPostCommentTool = createTool({
  id: 'create_post_comment',
  description: 'Adds a comment to a post.',
  inputSchema: z.object({
    postUuid: z.string().describe('Post uuid.'),
    content: z.string().min(1).max(1000),
  }),
  outputSchema: commentSchema,
  execute: async ({ postUuid, content }, { requestContext }) =>
    toComment(
      await callApi<ApiComment>(requestContext, 'POST', '/post-comments', { postUuid, content }),
    ),
});

export const updatePostCommentTool = createTool({
  id: 'update_post_comment',
  description: "Edits the user's own comment.",
  inputSchema: z.object({
    commentUuid: z.string().describe('Comment uuid from list_post_comments.'),
    content: z.string().min(1).max(1000),
  }),
  outputSchema: commentSchema,
  execute: async ({ commentUuid, content }, { requestContext }) =>
    toComment(
      await callApi<ApiComment>(requestContext, 'PUT', `/post-comments/${commentUuid}`, {
        content,
      }),
    ),
});

export const deletePostCommentTool = createTool({
  id: 'delete_post_comment',
  description: "Deletes the user's own comment.",
  inputSchema: z.object({
    commentUuid: z.string().describe('Comment uuid from list_post_comments.'),
  }),
  outputSchema: z.object({ message: z.string() }),
  execute: async ({ commentUuid }, { requestContext }) =>
    callApi<{ message: string }>(requestContext, 'DELETE', `/post-comments/${commentUuid}`),
});

export const postCommentTools = {
  list_post_comments: listPostCommentsTool,
  create_post_comment: createPostCommentTool,
  update_post_comment: updatePostCommentTool,
  delete_post_comment: deletePostCommentTool,
};
