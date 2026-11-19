import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import {
  MastraStorageExporter,
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { agent } from './agents/agent';
import { assistant } from './agents/assistant';
import { documentAnalyzer } from './agents/document-analyzer';
import { embedTexts } from './embedding';
import { startScheduleTool, stopScheduleTool } from './tools/schedule-tools';

// Mastra'nın kayıt deposu ve doküman vektörleri aynı veritabanı dosyasını kullanır
const DATABASE_URL = process.env.TURSO_DATABASE_URL || 'file:./mastra.db';
const DATABASE_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || undefined;

export const mastra = new Mastra({
  // Sunucu yalnızca bu bilgisayardan erişilebilir olsun; aynı ağdaki başka cihazlar bağlanamasın
  server: {
    host: 'localhost',
    apiRoutes: [
      // API'nin metinleri vektöre çevirtmesi için; OpenRouter anahtarı sadece Mastra'da durur
      registerApiRoute('/embed', {
        method: 'POST',
        handler: async (c) => {
          const { texts } = await c.req.json<{ texts: string[] }>();
          try {
            return c.json({ embeddings: await embedTexts(texts) });
          } catch (error) {
            console.error('Embedding error:', error);
            return c.json({ message: 'Embedding alınamadı' }, 502);
          }
        },
      }),
    ],
  },
  bundler: {
    externals: ['@duckdb/node-bindings'],
  },
  agents: { agent, assistant, documentAnalyzer },
  tools: { startScheduleTool, stopScheduleTool },
  // Doküman analizinde (RAG) parçaların vektörleri burada saklanır ve aranır
  vectors: {
    documents: new LibSQLVector({
      id: 'documents',
      url: DATABASE_URL,
      authToken: DATABASE_AUTH_TOKEN,
    }),
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: DATABASE_URL,
      authToken: DATABASE_AUTH_TOKEN,
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new MastraStorageExporter(), new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
