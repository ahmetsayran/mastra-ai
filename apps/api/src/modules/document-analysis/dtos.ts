import { t } from 'elysia';
import { type ControllerHook, errorResponseDto } from '../../utils';

export const documentAnalysisDto = {
  body: t.Object({
    file: t.File(),
  }),
  response: {
    200: t.Object({
      projectPurpose: t.String(),
      requirements: t.Array(t.String()),
      actionItems: t.Array(t.String()),
    }),
    400: errorResponseDto[400],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Analyze',
    description:
      'Yüklenen PDF veya DOCX proje dokümanını analiz eder; projenin amacını, gereksinimlerini ve aksiyonlarını döndürür',
  },
} satisfies ControllerHook;
