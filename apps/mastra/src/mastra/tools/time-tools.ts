import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const DEFAULT_TIME_ZONE = 'Europe/Istanbul';

// Modeller bugünün tarihini kendi başına bilemez; bu araç gerçek saati verir.
export const currentTimeTool = createTool({
  id: 'get_current_time',
  description:
    'Returns the current date and time. Use it whenever the user asks about today, now, the current time or date, or needs a date calculated from today.',
  inputSchema: z.object({
    timeZone: z
      .string()
      .optional()
      .describe(
        `IANA time zone, e.g. "Europe/Istanbul" or "America/New_York". Defaults to ${DEFAULT_TIME_ZONE}.`,
      ),
  }),
  outputSchema: z.object({
    timeZone: z.string(),
    iso: z.string(),
    formatted: z.string(),
  }),
  execute: async ({ timeZone }) => {
    const zone = timeZone ?? DEFAULT_TIME_ZONE;
    const now = new Date();

    try {
      return {
        timeZone: zone,
        iso: now.toISOString(),
        formatted: new Intl.DateTimeFormat('tr-TR', {
          dateStyle: 'full',
          timeStyle: 'medium',
          timeZone: zone,
        }).format(now),
      };
    } catch {
      throw new Error(`Geçersiz saat dilimi: ${zone}`);
    }
  },
});
