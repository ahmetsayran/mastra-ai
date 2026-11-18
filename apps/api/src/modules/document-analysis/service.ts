import { MastraClient } from '@mastra/client-js';
import { BadGatewayException, BadRequestException } from '../../utils';
import { DOCUMENT_ANALYSIS_SCHEMA, type DocumentAnalysis } from './schema';
import { DOCX_MIME_TYPE, extractDocumentText, PDF_MIME_TYPE } from './text-extractor';

const DOCUMENT_ANALYZER_AGENT_ID = 'documentAnalyzer';

const client = new MastraClient({
  baseUrl: process.env.MASTRA_URL || 'http://localhost:4111',
  retries: 1,
});

// Tarayıcı veya araç dosya türünü göndermeyebilir; bu yüzden uzantıya da bakılır
const resolveMimeType = (file: File) => {
  const name = file.name.toLowerCase();
  if (file.type === PDF_MIME_TYPE || name.endsWith('.pdf')) return PDF_MIME_TYPE;
  if (file.type === DOCX_MIME_TYPE || name.endsWith('.docx')) return DOCX_MIME_TYPE;
  return null;
};

export abstract class DocumentAnalysisService {
  // Yüklenen PDF/DOCX dosyasının metnini çıkarır ve analiz eder
  static async analyzeFile(file: File): Promise<DocumentAnalysis> {
    const mimeType = resolveMimeType(file);
    if (!mimeType) throw new BadRequestException('Sadece PDF veya DOCX dosyası yüklenebilir');

    const text = await extractDocumentText(Buffer.from(await file.arrayBuffer()), mimeType);
    if (!text) throw new BadRequestException('Dosyadan metin okunamadı');

    return DocumentAnalysisService.analyze(text);
  }

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
