import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { evaluate } from './math';

// Modeller büyük sayılarla işlemde yanılabilir; bu araç kesin sonuç verir.
export const calculatorTool = createTool({
  id: 'calculate',
  description: 'Evaluates a math expression exactly.',
  inputSchema: z.object({
    expression: z
      .string()
      .describe('Math expression, e.g. "(1234 + 56) * 7.5" or "sqrt(144) + 2^10".'),
  }),
  outputSchema: z.object({
    expression: z.string(),
    result: z.number(),
    formatted: z.string(),
  }),
  execute: async ({ expression }) => {
    const result = evaluate(expression);
    return {
      expression,
      result,
      formatted: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 10 }).format(result),
    };
  },
});
