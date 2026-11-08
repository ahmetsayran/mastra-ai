import { t } from 'elysia';
import { type ControllerHook, errorResponseDto } from '../../utils';

const aiChatBody = t.Object({
  message: t.String({ minLength: 1, maxLength: 4000 }),
  threadId: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
});

export const aiChatDto = {
  body: aiChatBody,
  response: {
    200: t.Object({
      text: t.String(),
      threadId: t.String(),
    }),
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Chat',
    description: 'Mastra asistanına mesaj gönderir ve yanıtını döndürür',
  },
} satisfies ControllerHook;

export const aiChatStreamDto = {
  body: t.Object({
    ...aiChatBody.properties,
    // Yeniden üret / mesajı düzenle: ekrandaki bu sıradaki kullanıcı mesajı ve sonrası silinip mesaj yeniden gönderilir
    truncateFrom: t.Optional(t.Integer({ minimum: 0 })),
  }),
  detail: {
    summary: 'Chat (stream)',
    description:
      'Mastra asistanına mesaj gönderir ve yanıtı parça parça döndürür. Her satır bir JSON olayıdır: thread, status, text, error, done',
  },
} satisfies ControllerHook;

const aiThreadFlags = {
  pinned: t.Boolean(),
  locked: t.Boolean(),
  archived: t.Boolean(),
  // Paylaşım açıksa linkin gizli parçası, kapalıysa null
  shareToken: t.Union([t.String(), t.Null()]),
};

export const aiThreadsDto = {
  response: {
    200: t.Object({
      threads: t.Array(
        t.Object({ id: t.String(), title: t.String(), updatedAt: t.String(), ...aiThreadFlags }),
      ),
    }),
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Sohbet geçmişi',
    description: 'Kullanıcının geçmiş sohbetlerini en yeniden eskiye doğru listeler',
  },
} satisfies ControllerHook;

export const aiThreadSearchDto = {
  query: t.Object({ q: t.String({ minLength: 2, maxLength: 100 }) }),
  response: {
    200: t.Object({ ids: t.Array(t.String()) }),
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Sohbetlerde arama',
    description: "Mesaj içeriğinde arama yapar, eşleşen thread ID'lerini döndürür",
  },
} satisfies ControllerHook;

const aiThreadParams = t.Object({ threadId: t.String({ pattern: '^[A-Za-z0-9_-]{1,64}$' }) });

export const aiThreadMessagesDto = {
  params: aiThreadParams,
  response: {
    200: t.Object({
      messages: t.Array(
        t.Object({
          role: t.Union([t.Literal('user'), t.Literal('assistant')]),
          text: t.String(),
          // Sadece asistan yanıtlarında, kullanıcı geri bildirim verdiyse bulunur
          feedback: t.Optional(t.Union([t.Literal('up'), t.Literal('down')])),
        }),
      ),
    }),
    404: errorResponseDto[404],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Sohbet mesajları',
    description: 'Bir sohbetin mesajlarını eskiden yeniye doğru döndürür',
  },
} satisfies ControllerHook;

export const aiMessageFeedbackDto = {
  params: t.Object({
    threadId: t.String({ pattern: '^[A-Za-z0-9_-]{1,64}$' }),
    // Ekrandaki (görünen) mesaj listesindeki sıra
    index: t.Numeric({ minimum: 0 }),
  }),
  body: t.Object({ value: t.Union([t.Literal('up'), t.Literal('down'), t.Null()]) }),
  response: {
    200: t.Object({ success: t.Boolean() }),
    400: errorResponseDto[400],
    404: errorResponseDto[404],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Yanıta geri bildirim',
    description:
      'Asistan yanıtını beğenir (up), beğenmez (down) veya geri bildirimi kaldırır (null)',
  },
} satisfies ControllerHook;

export const aiThreadUpdateDto = {
  params: aiThreadParams,
  body: t.Object({
    title: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
    pinned: t.Optional(t.Boolean()),
    locked: t.Optional(t.Boolean()),
    archived: t.Optional(t.Boolean()),
    shared: t.Optional(t.Boolean()),
  }),
  response: {
    200: t.Object({ id: t.String(), title: t.String(), ...aiThreadFlags }),
    400: errorResponseDto[400],
    404: errorResponseDto[404],
    423: errorResponseDto[423],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Sohbeti güncelle',
    description:
      'Sohbetin adını değiştirir; sabitleme, kilit, arşiv ve paylaşım durumunu açar veya kapatır',
  },
} satisfies ControllerHook;

export const aiThreadDeleteDto = {
  params: aiThreadParams,
  response: {
    200: t.Object({ success: t.Boolean() }),
    404: errorResponseDto[404],
    423: errorResponseDto[423],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Sohbeti sil',
    description: 'Bir sohbeti ve mesajlarını kalıcı olarak siler. Kilitli sohbet silinemez',
  },
} satisfies ControllerHook;

export const aiSharedThreadDto = {
  params: t.Object({ token: t.String({ pattern: '^[A-Za-z0-9_-]{16,64}$' }) }),
  response: {
    200: t.Object({
      title: t.String(),
      updatedAt: t.String(),
      messages: t.Array(
        t.Object({ role: t.Union([t.Literal('user'), t.Literal('assistant')]), text: t.String() }),
      ),
    }),
    404: errorResponseDto[404],
    502: errorResponseDto[502],
  },
  detail: {
    summary: 'Paylaşılan sohbet',
    description: 'Paylaşım linkine sahip herkesin giriş yapmadan okuyabildiği salt okunur sohbet',
  },
} satisfies ControllerHook;
