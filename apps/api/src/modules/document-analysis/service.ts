import { MastraClient } from '@mastra/client-js';
import { BadGatewayException } from '../../utils';
import { DOCUMENT_ANALYSIS_SCHEMA, type DocumentAnalysis } from './schema';

const DOCUMENT_ANALYZER_AGENT_ID = 'documentAnalyzer';

const client = new MastraClient({
  baseUrl: process.env.MASTRA_URL || 'http://localhost:4111',
  retries: 1,
});

export abstract class DocumentAnalysisService {
  // Doküman metnini yapay zekâya analiz ettirir ve şemaya uygun sonucu döner
  static async analyze(text: string): Promise<DocumentAnalysis> {
    try {
      const result = await client
        .getAgent(DOCUMENT_ANALYZER_AGENT_ID)
        .generate<DocumentAnalysis>(text, {
          structuredOutput: { schema: DOCUMENT_ANALYSIS_SCHEMA },
        });

      return result.object;
    } catch (error) {
      console.error('Error in DocumentAnalysisService.analyze:', error);
      throw new BadGatewayException('Doküman analiz edilemedi');
    }
  }
}
