import { type Static, t } from 'elysia';

// Analiz sonucunun biçimi: hem structured output hem de endpoint cevabı bu şemayı kullanır
export const documentAnalysisSchema = t.Object(
  {
    projectPurpose: t.String({ description: 'Projenin amacı' }),
    requirements: t.Array(t.String(), { description: 'Projenin gereksinimleri' }),
    actionItems: t.Array(t.String(), { description: 'Projede yapılması gereken aksiyonlar' }),
  },
  { additionalProperties: false },
);

export type DocumentAnalysis = Static<typeof documentAnalysisSchema>;
