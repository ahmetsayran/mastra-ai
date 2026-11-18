import type { JSONSchema7 } from 'json-schema';

// Analiz sonucunun biçimi: structured output bu şemaya göre üretilir
export const DOCUMENT_ANALYSIS_SCHEMA: JSONSchema7 = {
  type: 'object',
  properties: {
    projectPurpose: { type: 'string', description: 'Projenin amacı' },
    requirements: {
      type: 'array',
      items: { type: 'string' },
      description: 'Projenin gereksinimleri',
    },
    actionItems: {
      type: 'array',
      items: { type: 'string' },
      description: 'Projede yapılması gereken aksiyonlar',
    },
  },
  required: ['projectPurpose', 'requirements', 'actionItems'],
  additionalProperties: false,
};

export type DocumentAnalysis = {
  projectPurpose: string;
  requirements: string[];
  actionItems: string[];
};
