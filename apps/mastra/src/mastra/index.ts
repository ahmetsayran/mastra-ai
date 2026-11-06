import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
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
import { startScheduleTool, stopScheduleTool } from './tools/schedule-tools';

export const mastra = new Mastra({
  // Sunucu yalnızca bu bilgisayardan erişilebilir olsun; aynı ağdaki başka cihazlar bağlanamasın
  server: {
    host: 'localhost',
  },
  bundler: {
    externals: ['@duckdb/node-bindings'],
  },
  agents: { agent, assistant },
  tools: { startScheduleTool, stopScheduleTool },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: process.env.TURSO_DATABASE_URL || 'file:./mastra.db',
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
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
