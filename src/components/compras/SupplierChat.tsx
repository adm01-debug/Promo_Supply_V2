import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical,
  Phone,
  Video,
  Building2,
  Clock,
  Check,
  CheckCheck,
  FileText,
  Smile,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useContactNotes, ContactNote } from "@/hooks/useContactNotes";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizeText } from "@/hooks/useFuseSearch";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
}

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

  // Hook for notes - now uses fornecedor_id
  const { 
    notes, 
    loading: loadingNotes, 
    createNote 
  } = useContactNotes(undefined, selectedContact?.fornecedorId);

  // Convert fornecedores to chat contacts
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

  // Fuse.js for fuzzy contact search
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

  // Filter contacts by search with fuzzy matching
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const normalizedQuery = normalizeText(searchQuery);
    const results = contactFuse.search(searchQuery);
    const normalizedResults = contactFuse.search(normalizedQuery);
    
    // Merge and deduplicate
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

  // Convert notes to messages
  const messages = useMemo<Message[]>(() => {
    return notes.map(note => ({
      id: note.id,
      senderId: note.author_id === user?.id ? 'me' : note.author_id || 'supplier',
      senderName: note.author_id === user?.id ? 'Você' : 'Fornecedor',
      content: note.content,
      timestamp: new Date(note.created_at),
      status: 'read' as const,
      type: 'text' as const,
    })).reverse(); // Reverse to show oldest first
  }, [notes, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Presence channel for typing indicator
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

  // Update typing status
  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!presenceChannelRef.current || !user) return;
    
    try {
      await presenceChannelRef.current.track({
        userId: user.id,
        userName: user.email?.split('@')[0] || 'Usuário',
        isTyping: typing,
        online_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  }, [isTyping, updateTypingStatus]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sendingMessage) return;

    // Stop typing indicator when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    updateTypingStatus(false);

    setSendingMessage(true);
    
    const result = await createNote({
      contact_id: selectedContact.id,
      fornecedor_id: selectedContact.fornecedorId,
      content: newMessage.trim(),
    });

    if (result) {
      setNewMessage('');
    }
    
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
      {/* Floating Chat Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs"
          >
            {totalUnread}
          </Badge>
        )}
      </Button>

      {/* Chat Dialog */}
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
                  <Input
                    placeholder="Buscar contato..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loadingFornecedores ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum fornecedor encontrado
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        className={cn(
                          "w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left",
                          selectedContact?.id === contact.id && "bg-muted"
                        )}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback>
                              <Building2 className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          {contact.online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-background rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">
                              {contact.name}
                            </span>
                            {contact.lastMessageTime && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(contact.lastMessageTime, { 
                                  addSuffix: false, 
                                  locale: ptBR 
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.company}
                          </p>
                          {contact.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {contact.lastMessage}
                            </p>
                          )}
                        </div>

                        {contact.unreadCount > 0 && (
                          <Badge variant="default" className="h-5 min-w-[20px] px-1 text-xs">
                            {contact.unreadCount}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedContact ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedContact.avatar} />
                        <AvatarFallback>
                          <Building2 className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedContact.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {selectedContact.online ? (
                            <>
                              <span className="w-2 h-2 bg-success rounded-full" />
                              Online
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Offline
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Video className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                          <DropdownMenuItem>Ver cotações</DropdownMenuItem>
                          <DropdownMenuItem>Arquivar conversa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Bloquear
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingNotes ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma mensagem ainda</p>
                        <p className="text-xs">Envie uma mensagem para iniciar a conversa</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => {
                          const isMe = message.senderId === 'me';
                          const showDate = index === 0 || 
                            format(messages[index - 1].timestamp, 'yyyy-MM-dd') !== 
                            format(message.timestamp, 'yyyy-MM-dd');

                          return (
                            <div key={message.id}>
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <Badge variant="outline" className="text-xs">
                                    {format(message.timestamp, "dd 'de' MMMM", { locale: ptBR })}
                                  </Badge>
                                </div>
                              )}
                              
                              <div className={cn(
                                "flex",
                                isMe ? "justify-end" : "justify-start"
                              )}>
                                <div className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2",
                                  isMe 
                                    ? "bg-primary text-primary-foreground rounded-br-md" 
                                    : "bg-muted rounded-bl-md"
                                )}>
                                  {message.type === 'file' && (
                                    <div className={cn(
                                      "flex items-center gap-2 p-2 rounded mb-1",
                                      isMe ? "bg-primary-foreground/10" : "bg-background"
                                    )}>
                                      <FileText className="w-5 h-5" />
                                      <span className="text-sm truncate">
                                        {message.attachmentName}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {message.type !== 'file' && (
                                    <p className="text-sm whitespace-pre-wrap">
                                      {message.content}
                                    </p>
                                  )}
                                  
                                  <div className={cn(
                                    "flex items-center gap-1 mt-1",
                                    isMe ? "justify-end" : "justify-start"
                                  )}>
                                    <span className={cn(
                                      "text-[10px]",
                                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                    )}>
                                      {format(message.timestamp, 'HH:mm')}
                                    </span>
                                    {isMe && (
                                      message.status === 'read' ? (
                                        <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                                      ) : message.status === 'delivered' ? (
                                        <CheckCheck className="w-3 h-3 text-primary-foreground/50" />
                                      ) : (
                                        <Check className="w-3 h-3 text-primary-foreground/50" />
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <div className="px-4 py-2 border-t bg-muted/30">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs italic">
                          {typingUsers.length === 1 
                            ? `${typingUsers[0]} está digitando...`
                            : `${typingUsers.slice(0, -1).join(', ')} e ${typingUsers[typingUsers.length - 1]} estão digitando...`
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex items-end gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                        <Paperclip className="w-5 h-5" />
                      </Button>
                      
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder="Digite sua mensagem..."
                          value={newMessage}
                          onChange={handleMessageChange}
                          onKeyDown={handleKeyPress}
                          className="min-h-[44px] max-h-32 resize-none pr-10"
                          rows={1}
                          disabled={sendingMessage}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-1 bottom-1 h-8 w-8"
                        >
                          <Smile className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </div>
                      
                      <Button 
                        size="icon" 
                        className="h-10 w-10 flex-shrink-0"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                // No contact selected
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Selecione uma conversa</p>
                  <p className="text-sm">Escolha um fornecedor para iniciar o chat</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
