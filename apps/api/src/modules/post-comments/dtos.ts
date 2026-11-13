import { PostCommentPlain, PostCommentPlainInputUpdate } from '@onlyjs/db/prismabox/PostComment';
import { t } from 'elysia';
import { type ControllerHook, errorResponseDto, uuidValidation } from '../../utils';
import { paginationQueryDto, paginationResponseDto } from '../../utils/pagination';

export const postCommentResponseDto = t.Composite([
  PostCommentPlain,
  t.Object({
    postUuid: t.String(),
    author: t.Object({
      id: t.String(),
      name: t.String(),
    }),
  }),
]);

const commentParams = t.Object({ uuid: uuidValidation });

export const postCommentIndexDto = {
  query: t.Object({
    ...paginationQueryDto.properties,
    postUuid: uuidValidation,
  }),
  response: {
    200: paginationResponseDto(postCommentResponseDto),
    404: errorResponseDto[404],
  },
  detail: {
    summary: 'Index',
    description: 'Bir gönderinin yorumlarını listeler',
  },
} satisfies ControllerHook;

export const postCommentShowDto = {
  params: commentParams,
  response: { 200: postCommentResponseDto, 404: errorResponseDto[404] },
  detail: {
    summary: 'Show',
    description: 'Yorum detayını döndürür',
  },
} satisfies ControllerHook;

export const postCommentCreateDto = {
  body: t.Object({
    postUuid: uuidValidation,
    content: t.String({ minLength: 1, maxLength: 1000 }),
  }),
  response: { 200: postCommentResponseDto, 404: errorResponseDto[404], 422: errorResponseDto[422] },
  detail: {
    summary: 'Create',
    description: 'Gönderiye yorum ekler',
  },
} satisfies ControllerHook;

export const postCommentUpdateDto = {
  params: commentParams,
  body: PostCommentPlainInputUpdate,
  response: {
    200: postCommentResponseDto,
    403: errorResponseDto[403],
    404: errorResponseDto[404],
    422: errorResponseDto[422],
  },
  detail: {
    summary: 'Update',
    description: 'Yorumu günceller. Sadece yorumun sahibi yapabilir',
  },
} satisfies ControllerHook;

export const postCommentDestroyDto = {
  params: commentParams,
  response: {
    200: t.Object({ message: t.String() }),
    403: errorResponseDto[403],
    404: errorResponseDto[404],
  },
  detail: {
    summary: 'Destroy',
    description: 'Yorumu siler. Sadece yorumun sahibi yapabilir',
  },
} satisfies ControllerHook;
