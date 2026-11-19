import { t } from 'elysia';
import { type ControllerHook, errorResponseDto } from '../../utils';

// Analiz sonucunun biçimi: hem structured output hem de endpoint cevabı bu şemayı kullanır
export const documentAnalysisResponseDto = t.Object(
  {
    projectPurpose: t.String({ description: 'Projenin amacı' }),
    requirements: t.Array(t.String(), { description: 'Projenin gereksinimleri' }),
    actionItems: t.Array(t.String(), { description: 'Projede yapılması gereken aksiyonlar' }),
  },
  { additionalProperties: false },
);

export const documentAnalysisDto = {
  body: t.Object({
    file: t.File(),
  }),
  response: {
    200: documentAnalysisResponseDto,
    400: errorResponseDto[400],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Analyze',
    description:
      'Yüklenen PDF veya DOCX proje dokümanını analiz eder; projenin amacını, gereksinimlerini ve aksiyonlarını döndürür',
  },
} satisfies ControllerHook;
