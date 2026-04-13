import {
  MessageCircle,
  Send,
  Paperclip,
  Phone,
  Video,
  Building2,
  Clock,
  Check,
  CheckCheck,
  FileText,
  Smile,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import React from "react";

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
  fornecedorId: string;
}

interface ChatAreaProps {
  selectedContact: ChatContact | null;
  messages: Message[];
  loadingNotes: boolean;
  typingUsers: string[];
  newMessage: string;
  sendingMessage: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSendMessage: () => void;
}

export function ChatArea({
  selectedContact,
  messages,
  loadingNotes,
  typingUsers,
  newMessage,
  sendingMessage,
  messagesEndRef,
  onMessageChange,
  onKeyPress,
  onSendMessage,
}: ChatAreaProps) {
  if (!selectedContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha um fornecedor para iniciar o chat</p>
      </div>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedContact.avatar} />
            <AvatarFallback><Building2 className="w-5 h-5" /></AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{selectedContact.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {selectedContact.online ? (
                <><span className="w-2 h-2 bg-success rounded-full" />Online</>
              ) : (
                <><Clock className="w-3 h-3" />Offline</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9"><Video className="w-4 h-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Ver perfil</DropdownMenuItem>
              <DropdownMenuItem>Ver cotações</DropdownMenuItem>
              <DropdownMenuItem>Arquivar conversa</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Bloquear</DropdownMenuItem>
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
                  <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                    )}>
                      {message.type === 'file' && (
                        <div className={cn("flex items-center gap-2 p-2 rounded mb-1", isMe ? "bg-primary-foreground/10" : "bg-background")}>
                          <FileText className="w-5 h-5" />
                          <span className="text-sm truncate">{message.attachmentName}</span>
                        </div>
                      )}
                      {message.type !== 'file' && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                        <span className={cn("text-[10px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {format(message.timestamp, 'HH:mm')}
                        </span>
                        {isMe && (
                          message.status === 'read' ? <CheckCheck className="w-3 h-3 text-primary-foreground/70" /> :
                          message.status === 'delivered' ? <CheckCheck className="w-3 h-3 text-primary-foreground/50" /> :
                          <Check className="w-3 h-3 text-primary-foreground/50" />
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
                : `${typingUsers.slice(0, -1).join(', ')} e ${typingUsers[typingUsers.length - 1]} estão digitando...`}
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
              onChange={onMessageChange}
              onKeyDown={onKeyPress}
              className="min-h-[44px] max-h-32 resize-none pr-10"
              rows={1}
              disabled={sendingMessage}
            />
            <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-8 w-8">
              <Smile className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
          <Button
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={onSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
          >
            {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </>
  );
}
