import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import { 
  MessageCircle, 
  Search, 
  Building2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useContactNotes } from "@/hooks/useContactNotes";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ptBR } from "date-fns/locale/pt-BR";
import { normalizeText } from "@/hooks/useFuseSearch";
import { ChatArea } from "./chat/ChatArea";

interface ChatContact {
  id: string;
  name: string;
  company: string;
  avatar?: string;
  online: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  fornecedorId: string;
}

export function SupplierChat() {
  const { user } = useAuth();
  const { fornecedores, loading: loadingFornecedores } = useFornecedores();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { 
    notes, 
    loading: loadingNotes, 
    createNote 
  } = useContactNotes(undefined, selectedContact?.fornecedorId);

  const contacts = useMemo<ChatContact[]>(() => {
    return fornecedores.slice(0, 15).map((fornecedor, index) => ({
      id: fornecedor.id,
      fornecedorId: fornecedor.id,
      name: fornecedor.nome_fantasia || fornecedor.razao_social,
      company: fornecedor.razao_social,
      online: index % 3 === 0,
      lastMessage: undefined,
      lastMessageTime: undefined,
      unreadCount: 0,
    }));
  }, [fornecedores]);

  const contactFuse = useMemo(() => {
    const preparedContacts = contacts.map(c => ({
      ...c,
      normalizedName: normalizeText(c.name),
      normalizedCompany: normalizeText(c.company),
    }));
    return new Fuse(preparedContacts, {
      isCaseSensitive: false,
      includeScore: true,
      threshold: 0.4,
      keys: [
        { name: 'name', weight: 2.0 },
        { name: 'company', weight: 1.5 },
        { name: 'normalizedName', weight: 1.8 },
        { name: 'normalizedCompany', weight: 1.3 },
      ],
    });
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const normalizedQuery = normalizeText(searchQuery);
    const results = contactFuse.search(searchQuery);
    const normalizedResults = contactFuse.search(normalizedQuery);
    const seenIds = new Set<string>();
    const merged: ChatContact[] = [];
    [...results, ...normalizedResults].forEach(r => {
      if (!seenIds.has(r.item.id)) {
        seenIds.add(r.item.id);
        merged.push(r.item);
      }
    });
    return merged.length > 0 ? merged : contacts.filter(
      c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery, contactFuse]);

  const messages = useMemo(() => {
    return notes.map(note => ({
      id: note.id,
      senderId: note.author_id === user?.id ? 'me' : note.author_id || 'supplier',
      senderName: note.author_id === user?.id ? 'Você' : 'Fornecedor',
      content: note.content,
      timestamp: new Date(note.created_at),
      status: 'read' as const,
      type: 'text' as const,
    })).reverse();
  }, [notes, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedContact || !user) return;
    const channelName = `chat-presence-${selectedContact.fornecedorId}`;
    const channel = supabase.channel(channelName);
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const usersTyping: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence: Record<string, unknown>) => {
            if (presence.isTyping && presence.userId !== user.id) {
              usersTyping.push((presence.userName as string) || 'Alguém');
            }
          });
        });
        setTypingUsers(usersTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            userName: user.email?.split('@')[0] || 'Usuário',
            isTyping: false,
            online_at: new Date().toISOString(),
          });
        }
      });
    presenceChannelRef.current = channel;
    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [selectedContact?.fornecedorId, user]);

  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!presenceChannelRef.current || !user) return;
    try {
      await presenceChannelRef.current.track({
        userId: user.id,
        userName: user.email?.split('@')[0] || 'Usuário',
        isTyping: typing,
        online_at: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error('Error updating typing status:', error);
    }
  }, [user]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  }, [isTyping, updateTypingStatus]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sendingMessage) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    updateTypingStatus(false);
    setSendingMessage(true);
    const result = await createNote({
      contact_id: selectedContact.id,
      fornecedor_id: selectedContact.fornecedorId,
      content: newMessage.trim(),
    });
    if (result) setNewMessage('');
    setSendingMessage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const totalUnread = contacts.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <>
      <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50" onClick={() => setIsOpen(true)}>
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs">{totalUnread}</Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent aria-describedby="dialog-desc" className="max-w-4xl h-[600px] p-0 gap-0">
          <div className="flex h-full">
            {/* Contacts Sidebar */}
            <div className="w-80 border-r flex flex-col">
              <div className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Chat Fornecedores
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar contato..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {loadingFornecedores ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Nenhum fornecedor encontrado</div>
                ) : (
                  <div className="divide-y">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        className={cn("w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left", selectedContact?.id === contact.id && "bg-muted")}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback><Building2 className="w-5 h-5" /></AvatarFallback>
                          </Avatar>
                          {contact.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-background rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{contact.name}</span>
                            {contact.lastMessageTime && (
                              <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(contact.lastMessageTime, { addSuffix: false, locale: ptBR })}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
                          {contact.lastMessage && <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.lastMessage}</p>}
                        </div>
                        {contact.unreadCount > 0 && <Badge variant="default" className="h-5 min-w-[20px] px-1 text-xs">{contact.unreadCount}</Badge>}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <ChatArea
                selectedContact={selectedContact}
                messages={messages}
                loadingNotes={loadingNotes}
                typingUsers={typingUsers}
                newMessage={newMessage}
                sendingMessage={sendingMessage}
                messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
                onMessageChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
