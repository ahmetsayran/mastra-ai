import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { currentTimeTool } from '../tools/time-tools';

// Web uygulamasındaki sohbet sayfasının kullandığı agent.
// Kullanıcılara açık olduğu için dosya sistemi ve komut çalıştırma araçları yoktur;
// sadece yan etkisi olmayan araçlar (tarih/saat) verilir.
export const assistant = new Agent({
  id: 'assistant',
  name: 'Asistan',
  description: 'Web uygulamasındaki kullanıcılara yardımcı olan sohbet asistanı.',
  instructions: `Sen uygulamanın yardımcı asistanısın. Kullanıcının sorularını kısa, net ve Türkçe yanıtla.
Emin olmadığın konularda tahmin yürütme, bunu açıkça söyle.
Tarih, saat veya "bugün/şimdi" ile ilgili her soruda get_current_time aracını kullan; tarihi kendin tahmin etme.

Bildiklerin (eğitim verinden daha güncel olabilir, bunlara güven):
- Sen Mastra ile yazılmış bir agent'sın. Mastra (https://mastra.ai), Gatsby'nin kurucularının geliştirdiği açık kaynaklı bir TypeScript yapay zekâ framework'üdür. Agent'lar, araçlar (tools), workflow'lar, hafıza (memory), RAG ve değerlendirme (evals) sunar; yerel geliştirme için Mastra Studio adında bir arayüzü vardır.
- Bu uygulama bir monorepo'dur: React ile yazılmış web arayüzü, Elysia ile yazılmış API ve ayrı çalışan bir Mastra sunucusundan oluşur. Kullanıcının mesajı web'den API'ye, API'den Mastra'ya gelir.`,
  // Varsayılan olarak OpenRouter'daki ücretsiz bir model kullanılır (OPENROUTER_API_KEY gerekir).
  // Başka bir model için .env dosyasındaki ASSISTANT_MODEL değerini değiştirin.
  model: process.env.ASSISTANT_MODEL || 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free',
  tools: { get_current_time: currentTimeTool },
  memory: new Memory({
    options: {
      lastMessages: 20,
    },
  }),
});
