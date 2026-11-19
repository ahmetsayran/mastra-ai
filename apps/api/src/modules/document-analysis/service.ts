import { FileLibraryAssetMimeType, FileLibraryAssetType } from '@onlyjs/db/client';
import { mastraClient } from '../../core/mastra-client';
import { BadGatewayException, BadRequestException } from '../../utils';
import {
  FILE_LIBRARY_ASSET_PROJECT_DOCUMENT_RULES,
  normalizeMimeType,
} from '../file-library-assets/constants';
import { FileLibraryAssetsService } from '../file-library-assets/service';
import { docxService } from '../file-library-assets/services/docx.service';
import { pdfService } from '../file-library-assets/services/pdf.service';
import { documentAnalysisResponseDto } from './dtos';
import { selectRelevantText } from './retrieval';
import type { DocumentAnalysisResponse } from './types';

const DOCUMENT_ANALYZER_AGENT_ID = 'documentAnalyzer';

// Bu uzunluğun üstündeki dokümanlarda tamamı yerine sadece ilgili parçalar (RAG) analiz edilir
const RAG_MIN_LENGTH = 100_000;

export abstract class DocumentAnalysisService {
  // Yüklenen PDF/DOCX dosyasını kaydeder, metnini çıkarır ve analiz eder
  static async analyzeFile(file: File): Promise<DocumentAnalysisResponse> {
    const { allowedMimeTypes, maxSize } = FILE_LIBRARY_ASSET_PROJECT_DOCUMENT_RULES;
    if (file.size > maxSize) {
      throw new BadRequestException(`Dosya en fazla ${maxSize / 1024 / 1024} MB olabilir`);
    }
    if (!allowedMimeTypes.includes(file.type)) {
      throw new BadRequestException('Sadece PDF veya DOCX dosyası yüklenebilir');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = (
      normalizeMimeType(file.type) === FileLibraryAssetMimeType.DOCUMENT_PDF
        ? await pdfService.extractTextFromBuffer(buffer, { mergePages: true })
        : await docxService.extractTextFromBuffer(buffer)
    ).trim();
    if (!text) throw new BadRequestException('Dosyadan metin okunamadı');

    // Okunabilen doküman, dosya kütüphanesine (diske ve veritabanına) kaydedilir
    const asset = await FileLibraryAssetsService.store({
      file,
      type: FileLibraryAssetType.PROJECT_DOCUMENT,
    });

    try {
      return await DocumentAnalysisService.analyze(
        text.length > RAG_MIN_LENGTH ? await selectRelevantText(asset.uuid, text) : text,
      );
    } catch (error) {
      // Analiz başarısız olursa kaydedilen dosya geride bırakılmaz (tekrar denemede kopya oluşmaz)
      await FileLibraryAssetsService.destroy(asset.uuid).catch(() => undefined);
      throw error;
    }
  }

  // Doküman metnini yapay zekâya analiz ettirir ve şemaya uygun sonucu döner
  private static async analyze(text: string): Promise<DocumentAnalysisResponse> {
    try {
      const result = await mastraClient
        .getAgent(DOCUMENT_ANALYZER_AGENT_ID)
        .generate<DocumentAnalysisResponse>(text, {
          structuredOutput: { schema: documentAnalysisResponseDto },
        });

      return result.object;
    } catch (error) {
      console.error('Error in DocumentAnalysisService.analyze:', error);
      throw new BadGatewayException('Doküman analiz edilemedi');
    }
  }
}
