import { Elysia } from 'elysia';
import { auth, dtoWithPermission, PERMISSIONS } from '../auth';
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
    dtoWithPermission(documentAnalysisDto, PERMISSIONS.FILE_LIBRARY_ASSETS.CREATE),
  );
