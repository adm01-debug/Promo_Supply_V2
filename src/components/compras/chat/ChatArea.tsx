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
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
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
      {/* Premium Chat Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              <AvatarImage src={selectedContact.avatar} />
              <AvatarFallback className="bg-primary/5 text-primary">
                <Building2 className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            {selectedContact.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-background rounded-full shadow-sm" />
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold tracking-tight text-foreground/90">{selectedContact.name}</p>
              {selectedContact.online && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-widest bg-success/10 text-success border-none">
                  Online
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              {selectedContact.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-1 mr-2 px-2 py-1 rounded-lg bg-primary/5 border border-primary/10">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-tighter text-primary">IA Sync</span>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
            <Video className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl transition-all">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-primary/10 shadow-2xl">
              <DropdownMenuItem className="text-xs font-medium rounded-lg">Ver perfil completo</DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-medium rounded-lg">Histórico de cotações</DropdownMenuItem>
              <DropdownMenuItem className="text-xs font-medium rounded-lg">Análise de performance</DropdownMenuItem>
              <div className="h-px bg-border/50 my-1" />
              <DropdownMenuItem className="text-xs font-medium rounded-lg text-destructive">Bloquear fornecedor</DropdownMenuItem>
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
          <div className="space-y-6 pb-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => {
                const isMe = message.senderId === 'me';
                const showDate = index === 0 ||
                  format(messages[index - 1].timestamp, 'yyyy-MM-dd') !==
                  format(message.timestamp, 'yyyy-MM-dd');

                return (
                  <motion.div 
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 25, stiffness: 500 }}
                  >
                    {showDate && (
                      <div className="flex justify-center my-6">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-[0.2em] bg-muted/30 border-none text-muted-foreground/80 px-3 py-1 rounded-full">
                          {format(message.timestamp, "dd 'de' MMMM", { locale: ptBR })}
                        </Badge>
                      </div>
                    )}
                    <div className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] space-y-1",
                        isMe ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "relative rounded-[1.25rem] px-4 py-2.5 shadow-sm transition-all duration-300",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-tr-none hover:shadow-md hover:translate-x-[-2px]" 
                            : "bg-card border border-border/50 text-foreground rounded-tl-none hover:shadow-md hover:translate-x-[2px]"
                        )}>
                          {message.type === 'file' && (
                            <div className={cn(
                              "flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors", 
                              isMe ? "bg-white/10" : "bg-primary/5"
                            )}>
                              <div className={cn(
                                "p-2 rounded-lg",
                                isMe ? "bg-white/20" : "bg-primary/10 text-primary"
                              )}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate leading-none">{message.attachmentName}</p>
                                <p className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-white" : "text-muted-foreground")}>Documento • 2.4 MB</p>
                              </div>
                            </div>
                          )}
                          {message.type !== 'file' && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                          )}
                          <div className={cn("flex items-center gap-1.5 mt-1.5", isMe ? "justify-end" : "justify-start")}>
                            <span className={cn("text-[9px] font-bold", isMe ? "text-primary-foreground/60" : "text-muted-foreground/60")}>
                              {format(message.timestamp, 'HH:mm')}
                            </span>
                            {isMe && (
                              <div className="flex">
                                {message.status === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-white" />
                                ) : (
                                  <Check className="w-3 h-3 text-white/50" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Premium Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 border-t bg-muted/20 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} está digitando...`
                  : `Múltiplos contatos digitando...`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
