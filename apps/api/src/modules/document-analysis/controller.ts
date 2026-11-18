import { Elysia } from 'elysia';
import { auth } from '../auth';
import { documentAnalysisDto } from './dtos';
import { DocumentAnalysisService } from './service';

export const documentAnalysisController = new Elysia({
  prefix: '/document-analysis',
  tags: ['Document Analysis'],
})
  .use(auth())
  .post(
    '/',
    async ({ body }) => DocumentAnalysisService.analyzeFile(body.file),
    documentAnalysisDto,
  );
