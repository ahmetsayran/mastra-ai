import { FileLibraryAssetMimeType } from '@onlyjs/db/client';
import { mastraClient } from '../../core/mastra-client';
import { BadGatewayException, BadRequestException } from '../../utils';
import {
  FILE_LIBRARY_ASSET_DOCUMENT_RULES,
  normalizeMimeType,
} from '../file-library-assets/constants';
import { selectRelevantText } from './retrieval';
import { type DocumentAnalysis, documentAnalysisSchema } from './schema';
import { extractDocumentText } from './text-extractor';

const DOCUMENT_ANALYZER_AGENT_ID = 'documentAnalyzer';

// Bu uzunluğun üstündeki dokümanlarda tamamı yerine sadece ilgili parçalar (RAG) analiz edilir
const RAG_MIN_LENGTH = 100_000;

export abstract class DocumentAnalysisService {
  // Yüklenen PDF/DOCX dosyasının metnini çıkarır ve analiz eder
  static async analyzeFile(file: File): Promise<DocumentAnalysis> {
    const { maxSize } = FILE_LIBRARY_ASSET_DOCUMENT_RULES;
    if (file.size > maxSize) {
      throw new BadRequestException(`Dosya en fazla ${maxSize / 1024 / 1024} MB olabilir`);
    }

    const mimeType = normalizeMimeType(file.type);
    if (
      mimeType !== FileLibraryAssetMimeType.DOCUMENT_PDF &&
      mimeType !== FileLibraryAssetMimeType.DOCUMENT_DOCX
    ) {
      throw new BadRequestException('Sadece PDF veya DOCX dosyası yüklenebilir');
    }

    const text = await extractDocumentText(Buffer.from(await file.arrayBuffer()), mimeType);
    if (!text) throw new BadRequestException('Dosyadan metin okunamadı');

    return DocumentAnalysisService.analyze(
      text.length > RAG_MIN_LENGTH ? await selectRelevantText(text) : text,
    );
  }

  // Doküman metnini yapay zekâya analiz ettirir ve şemaya uygun sonucu döner
  private static async analyze(text: string): Promise<DocumentAnalysis> {
    try {
      const result = await mastraClient
        .getAgent(DOCUMENT_ANALYZER_AGENT_ID)
        .generate<DocumentAnalysis>(text, {
          structuredOutput: { schema: documentAnalysisSchema },
        });

      return result.object;
    } catch (error) {
      console.error('Error in DocumentAnalysisService.analyze:', error);
      throw new BadGatewayException('Doküman analiz edilemedi');
    }
  }
}
