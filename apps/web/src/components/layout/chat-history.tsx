import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { Input } from '#/components/ui/input';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from '#/components/ui/sidebar';
import {
  type ChatThread,
  type ChatThreadPatch,
  THREADS_QUERY_KEY,
  deleteThread,
  updateThread,
  useThreads,
} from '#/features/ai-assistant/api';
import {
  IconArchive,
  IconArchiveOff,
  IconChevronRight,
  IconCopy,
  IconDots,
  IconLock,
  IconLockOpen,
  IconMessage,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconPlus,
  IconSearch,
  IconShare,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

const shareUrl = (token: string) => `${window.location.origin}/shared/${token}`;

type ThreadItemProps = {
  thread: ChatThread;
  isActive: boolean;
  onUpdate: (patch: ChatThreadPatch) => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
};

function ThreadItem({ thread, isActive, onUpdate, onRename, onShare, onDelete }: ThreadItemProps) {
  const { setOpenMobile } = useSidebar();
  const LeadingIcon = thread.locked ? IconLock : thread.pinned ? IconPin : IconMessage;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={`${thread.title} · ${thread.id}`}
        className="h-auto py-1.5"
      >
        <Link
          to="/ai-assistant"
          search={{ thread: thread.id }}
          onClick={() => setOpenMobile(false)}
        >
          <LeadingIcon className="self-start" />
          {/* Başlığın altında thread ID'si küçük yazıyla görünür */}
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{thread.title}</span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <span className="truncate">{thread.id}</span>
              {thread.shareToken && (
                <IconShare className="size-3 shrink-0" aria-label="Paylaşılıyor" />
              )}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label="Sohbet seçenekleri">
            <IconDots />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        {/* Menü kapanırken odağı geri almasın, yoksa açılan pencerenin kutusuna yazılamaz */}
        <DropdownMenuContent
          side="right"
          align="start"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem onSelect={() => onUpdate({ pinned: !thread.pinned })}>
            {thread.pinned ? <IconPinnedOff /> : <IconPin />}
            {thread.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={thread.locked} onSelect={onRename}>
            <IconPencil />
            Yeniden adlandır
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShare}>
            <IconShare />
            {thread.shareToken ? 'Paylaşımı yönet' : 'Paylaş'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onUpdate({ locked: !thread.locked })}>
            {thread.locked ? <IconLockOpen /> : <IconLock />}
            {thread.locked ? 'Kilidi aç' : 'Kilitle'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onUpdate({ archived: !thread.archived })}>
            {thread.archived ? <IconArchiveOff /> : <IconArchive />}
            {thread.archived ? 'Arşivden çıkar' : 'Arşivle'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={thread.locked}
            className="text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            <IconTrash className="text-destructive" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

// Sidebar'da gezinme bağlantıları yerine geçmiş sohbetlerin listesi görünür
export function ChatHistory() {
  const { setOpenMobile } = useSidebar();
  const { data: threads, isLoading, isError } = useThreads();
  const onChatPage = useLocation({ select: (location) => location.pathname === '/ai-assistant' });
  const activeThread = useLocation({
    select: (location) => (location.search as { thread?: string }).thread,
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [renaming, setRenaming] = useState<ChatThread | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deleting, setDeleting] = useState<ChatThread | null>(null);
  // Paylaşım penceresi güncel durumu listeden okur, bu yüzden sadece id tutulur
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');

  const sharing = threads?.find((thread) => thread.id === sharingId) ?? null;

  // Arama sohbet adında ve thread ID'sinde yapılır (büyük/küçük harf fark etmez)
  const normalizedQuery = query.trim().toLocaleLowerCase('tr');
  const isSearching = normalizedQuery.length > 0;
  const visible =
    threads?.filter(
      (thread) =>
        !isSearching ||
        `${thread.title} ${thread.id}`.toLocaleLowerCase('tr').includes(normalizedQuery),
    ) ?? [];
  const pinned = visible.filter((thread) => thread.pinned && !thread.archived);
  const regular = visible.filter((thread) => !thread.pinned && !thread.archived);
  const archived = visible.filter((thread) => thread.archived);
  // Aramada eşleşen arşiv sohbetleri de görünsün diye arşiv bölümü kendiliğinden açılır
  const archiveOpen = showArchived || isSearching;

  const refresh = () => queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; patch: ChatThreadPatch }) =>
      updateThread(params.id, params.patch),
    onSuccess: () => void refresh(),
    onError: (error) => toast.error(error.message),
  });

  const renameMutation = useMutation({
    mutationFn: (params: { id: string; title: string }) =>
      updateThread(params.id, { title: params.title }),
    onSuccess: () => {
      setRenaming(null);
      void refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: (_data, id) => {
      setDeleting(null);
      void refresh();
      // Açık olan sohbet silindiyse boş bir yeni sohbete geç
      if (id === activeThread) void navigate({ to: '/ai-assistant', search: {} });
    },
  });

  const openRename = (thread: ChatThread) => {
    setNewTitle(thread.title);
    renameMutation.reset();
    setRenaming(thread);
  };

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!renaming || !title || title === renaming.title) return;
    renameMutation.mutate({ id: renaming.id, title });
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success('Link kopyalandı');
    } catch {
      toast.error('Link kopyalanamadı, kutudan elle kopyalayın');
    }
  };

  const renderItem = (thread: ChatThread) => (
    <ThreadItem
      key={thread.id}
      thread={thread}
      isActive={onChatPage && activeThread === thread.id}
      onUpdate={(patch) => updateMutation.mutate({ id: thread.id, patch })}
      onRename={() => openRename(thread)}
      onShare={() => setSharingId(thread.id)}
      onDelete={() => {
        deleteMutation.reset();
        setDeleting(thread);
      }}
    />
  );

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={onChatPage && !activeThread} tooltip="Yeni sohbet">
              <Link to="/ai-assistant" search={{}} onClick={() => setOpenMobile(false)}>
                <IconPlus />
                <span>Yeni sohbet</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {threads && threads.length > 0 && (
          <div className="relative mt-2 group-data-[collapsible=icon]:hidden">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
              placeholder="Sohbetlerde ara..."
              aria-label="Sohbetlerde ara"
              className="h-8 pr-8 pl-8"
            />
            {query && (
              <button
                type="button"
                aria-label="Aramayı temizle"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-4" />
              </button>
            )}
          </div>
        )}
      </SidebarGroup>

      {isLoading && (
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuSkeleton />
          </SidebarMenu>
        </SidebarGroup>
      )}

      {isError && (
        <p className="px-4 py-1 text-xs text-muted-foreground">Sohbet geçmişi yüklenemedi.</p>
      )}

      {pinned.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Sabitlenenler</SidebarGroupLabel>
          <SidebarMenu>{pinned.map(renderItem)}</SidebarMenu>
        </SidebarGroup>
      )}

      {/* Aramada sadece arşivde sonuç varsa boş "Sohbetler" başlığı gösterilmez */}
      {(!isSearching || regular.length > 0 || visible.length === 0) && (
        <SidebarGroup>
          <SidebarGroupLabel>Sohbetler</SidebarGroupLabel>
          <SidebarMenu>
            {regular.map(renderItem)}
            {threads && isSearching && visible.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Eşleşen sohbet bulunamadı.</p>
            )}
            {threads && !isSearching && regular.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                {pinned.length + archived.length === 0 ? 'Henüz sohbet yok.' : 'Başka sohbet yok.'}
              </p>
            )}
          </SidebarMenu>
        </SidebarGroup>
      )}

      {archived.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <button type="button" onClick={() => setShowArchived((open) => !open)}>
              <IconChevronRight
                className={`mr-1 size-3.5 transition-transform ${archiveOpen ? 'rotate-90' : ''}`}
              />
              Arşiv ({archived.length})
            </button>
          </SidebarGroupLabel>
          {archiveOpen && <SidebarMenu>{archived.map(renderItem)}</SidebarMenu>}
        </SidebarGroup>
      )}

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <form onSubmit={submitRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Sohbeti yeniden adlandır</DialogTitle>
            </DialogHeader>
            <Input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              maxLength={100}
              autoFocus
              aria-label="Sohbet adı"
            />
            {renameMutation.isError && (
              <p className="text-sm text-destructive">{renameMutation.error.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={
                  !newTitle.trim() ||
                  newTitle.trim() === renaming?.title ||
                  renameMutation.isPending
                }
              >
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sharing} onOpenChange={(open) => !open && setSharingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sohbeti paylaş</DialogTitle>
            <DialogDescription>
              Linke sahip olan herkes bu sohbeti giriş yapmadan, salt okunur olarak görebilir.
              Paylaşımı istediğin zaman durdurabilirsin; durdurunca link çalışmaz.
            </DialogDescription>
          </DialogHeader>

          {sharing?.shareToken ? (
            <div className="flex gap-2">
              <Input readOnly value={shareUrl(sharing.shareToken)} aria-label="Paylaşım linki" />
              <Button type="button" onClick={() => void copyLink(sharing.shareToken as string)}>
                <IconCopy className="mr-2 size-4" />
                Kopyala
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Bu sohbet şu an paylaşılmıyor.</p>
          )}

          <DialogFooter>
            {sharing?.shareToken ? (
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: sharing.id, patch: { shared: false } })}
              >
                Paylaşımı durdur
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!sharing || updateMutation.isPending}
                onClick={() =>
                  sharing && updateMutation.mutate({ id: sharing.id, patch: { shared: true } })
                }
              >
                Link oluştur
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sohbet silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" sohbeti ve tüm mesajları kalıcı olarak silinir. Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                // Silme bitene kadar pencere açık kalsın, hata olursa görünsün
                event.preventDefault();
                if (deleting) deleteMutation.mutate(deleting.id);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
