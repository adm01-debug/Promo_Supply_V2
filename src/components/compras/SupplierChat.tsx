import { useState, useRef, useEffect, useMemo } from "react";
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical,
  Phone,
  Video,
  X,
  User,
  Building2,
  Clock,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Smile
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fornecedoresMock } from "@/data/mockData";
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
}

// Generate mock chat contacts from suppliers
function generateChatContacts(): ChatContact[] {
  return fornecedoresMock.slice(0, 8).map((fornecedor, index) => ({
    id: fornecedor.id,
    name: `Vendedor ${fornecedor.nomeFantasia.split(' ')[0]}`,
    company: fornecedor.nomeFantasia,
    online: index % 3 === 0,
    lastMessage: index === 0 
      ? 'Acabei de enviar o orçamento atualizado' 
      : index === 1 
        ? 'Confirmado! Envio amanhã' 
        : 'Ok, vou verificar',
    lastMessageTime: new Date(Date.now() - index * 3600000 * (index + 1)),
    unreadCount: index === 0 ? 2 : index === 2 ? 1 : 0,
  }));
}

// Generate mock messages for a conversation
function generateMockMessages(contactId: string): Message[] {
  const now = new Date();
  const messages: Message[] = [
    {
      id: '1',
      senderId: contactId,
      senderName: 'Fornecedor',
      content: 'Bom dia! Recebi sua solicitação de cotação.',
      timestamp: new Date(now.getTime() - 3600000 * 5),
      status: 'read',
      type: 'text',
    },
    {
      id: '2',
      senderId: 'me',
      senderName: 'Você',
      content: 'Olá! Sim, precisamos de 5.000 unidades de canetas personalizadas.',
      timestamp: new Date(now.getTime() - 3600000 * 4.5),
      status: 'read',
      type: 'text',
    },
    {
      id: '3',
      senderId: contactId,
      senderName: 'Fornecedor',
      content: 'Entendido. Qual a arte para personalização?',
      timestamp: new Date(now.getTime() - 3600000 * 4),
      status: 'read',
      type: 'text',
    },
    {
      id: '4',
      senderId: 'me',
      senderName: 'Você',
      content: 'Segue o arquivo da logo em alta resolução.',
      timestamp: new Date(now.getTime() - 3600000 * 3.5),
      status: 'read',
      type: 'text',
    },
    {
      id: '5',
      senderId: 'me',
      senderName: 'Você',
      content: 'logo-empresa.pdf',
      timestamp: new Date(now.getTime() - 3600000 * 3.4),
      status: 'read',
      type: 'file',
      attachmentName: 'logo-empresa.pdf',
    },
    {
      id: '6',
      senderId: contactId,
      senderName: 'Fornecedor',
      content: 'Perfeito! Vou preparar o orçamento ainda hoje.',
      timestamp: new Date(now.getTime() - 3600000 * 3),
      status: 'read',
      type: 'text',
    },
    {
      id: '7',
      senderId: contactId,
      senderName: 'Fornecedor',
      content: 'Acabei de enviar o orçamento atualizado. Por favor, confira os valores.',
      timestamp: new Date(now.getTime() - 3600000 * 0.5),
      status: 'read',
      type: 'text',
    },
    {
      id: '8',
      senderId: contactId,
      senderName: 'Fornecedor',
      content: 'orcamento-canetas-5000un.pdf',
      timestamp: new Date(now.getTime() - 3600000 * 0.4),
      status: 'read',
      type: 'file',
      attachmentName: 'orcamento-canetas-5000un.pdf',
    },
  ];
  
  return messages;
}

export function SupplierChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts] = useState<ChatContact[]>(() => generateChatContacts());
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      c => c.name.toLowerCase().includes(query) || 
           c.company.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Load messages when contact is selected
  useEffect(() => {
    if (selectedContact) {
      setMessages(generateMockMessages(selectedContact.id));
    }
  }, [selectedContact]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      senderName: 'Você',
      content: newMessage,
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === message.id ? { ...m, status: 'delivered' as const } : m)
      );
    }, 1000);

    // Simulate message read
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === message.id ? { ...m, status: 'read' as const } : m)
      );
    }, 2000);
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
                            {contact.company}
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
                          {contact.name}
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
                        <p className="font-medium">{selectedContact.company}</p>
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
                        disabled={!newMessage.trim()}
                      >
                        <Send className="w-5 h-5" />
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
