import { useState, useRef, useEffect, useMemo } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      c => c.name.toLowerCase().includes(query) || 
           c.company.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sendingMessage) return;

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
        <DialogContent className="max-w-4xl h-[600px] p-0 gap-0">
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
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
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
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
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
                          onChange={(e) => setNewMessage(e.target.value)}
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
