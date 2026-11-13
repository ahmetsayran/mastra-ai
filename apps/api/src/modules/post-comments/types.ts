import type { Static } from 'elysia';
import { postCommentCreateDto, postCommentResponseDto, postCommentUpdateDto } from './dtos';

export type PostCommentCreatePayload = Static<(typeof postCommentCreateDto)['body']>;
export type PostCommentUpdatePayload = Static<(typeof postCommentUpdateDto)['body']>;
export type PostCommentResponse = Static<typeof postCommentResponseDto>;
