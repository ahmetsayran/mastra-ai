import { t } from 'elysia';
import { type ControllerHook, errorResponseDto } from '../../utils';
import { documentAnalysisSchema } from './schema';

export const documentAnalysisDto = {
  body: t.Object({
    file: t.File(),
  }),
  response: {
    200: documentAnalysisSchema,
    400: errorResponseDto[400],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Analyze',
    description:
      'Yüklenen PDF veya DOCX proje dokümanını analiz eder; projenin amacını, gereksinimlerini ve aksiyonlarını döndürür',
  },
} satisfies ControllerHook;
