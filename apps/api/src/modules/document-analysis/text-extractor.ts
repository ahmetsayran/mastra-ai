import { inflateRawSync } from 'node:zlib';
import { FileLibraryAssetMimeType } from '@onlyjs/db/client';
import { pdfService } from '../file-library-assets/services/pdf.service';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_ENTRY_SIGNATURE = 0x02014b50;
const LOCAL_ENTRY_SIGNATURE = 0x04034b50;

// DOCX bir zip dosyasıdır; paket kullanmadan içinden istenen dosyayı okur
const readZipEntry = (zip: Buffer, name: string): Buffer | null => {
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const entryCount = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (zip.readUInt32LE(offset) !== CENTRAL_ENTRY_SIGNATURE) return null;
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const entryName = zip.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (entryName === name) {
      if (zip.readUInt32LE(localOffset) !== LOCAL_ENTRY_SIGNATURE) return null;
      const dataStart =
        localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      return method === 0 ? data : inflateRawSync(data);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
};

const decodeXmlEntities = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const extractDocxText = (buffer: Buffer): string => {
  let xml: Buffer | null;
  try {
    xml = readZipEntry(buffer, 'word/document.xml');
  } catch (error) {
    console.error('❌ DOCX text extraction failed:', error);
    return '';
  }
  if (!xml) return '';

  const text = xml
    .toString('utf8')
    .replace(/<w:tab\s*\/>/g, '\t')
    .replace(/<w:(br|cr)\s*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeXmlEntities(text).trim();
};

/**
 * PDF veya DOCX dosyasından düz metni çıkarır.
 * Desteklenmeyen türde veya okunamayan dosyada boş metin döner.
 */
export const extractDocumentText = async (
  buffer: Buffer,
  mimeType: FileLibraryAssetMimeType,
): Promise<string> => {
  if (mimeType === FileLibraryAssetMimeType.DOCUMENT_PDF) {
    const text = await pdfService.extractTextFromBuffer(buffer, { mergePages: true });
    return text.trim();
  }
  if (mimeType === FileLibraryAssetMimeType.DOCUMENT_DOCX) {
    return extractDocxText(buffer);
  }
  return '';
};
