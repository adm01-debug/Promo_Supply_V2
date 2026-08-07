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
import { MessageBubble } from "./MessageBubble";

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
      {/* Ultra-Premium Glass Header */}
      <div className="p-5 border-b bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-2xl flex items-center justify-between sticky top-0 z-20 shadow-sm border-white/5">
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
          <div className="hidden sm:flex items-center gap-1.5 mr-3 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">IA INSIGHT</span>
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
            <AnimatePresence mode="popLayout" initial={false}>
              {messages.map((message, index) => {
                const isMe = message.senderId === 'me';
                const showDate = index === 0 ||
                  format(messages[index - 1].timestamp, 'yyyy-MM-dd') !==
                  format(message.timestamp, 'yyyy-MM-dd');

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={index}
                    isMe={isMe}
                    showDate={showDate}
                  />
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
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-24 left-6 z-30"
          >
            <div className="flex items-center gap-3 bg-card/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-1">
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 animate-pulse">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} escrevendo...`
                  : `Múltiplos contatos escrevendo...`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultra-premium Input Area */}
      <div className="p-5 border-t bg-gradient-to-t from-card to-card/90 backdrop-blur-2xl relative z-20">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all shadow-inner border border-white/5">
              <Paperclip className="w-5 h-5" />
            </Button>
          </motion.div>
          
          <div className="flex-1 relative group">
            <Textarea
              placeholder="Digite sua mensagem de negócio..."
              value={newMessage}
              onChange={onMessageChange}
              onKeyDown={onKeyPress}
              className={cn(
                "min-h-[52px] max-h-40 resize-none pr-14 pl-5 py-4 rounded-[1.5rem] bg-muted/50 border-white/5 shadow-inner focus:border-primary/40 focus:ring-primary/10 transition-all font-semibold text-[13px] scrollbar-hide leading-tight",
                "placeholder:text-muted-foreground/50 placeholder:font-bold placeholder:uppercase placeholder:tracking-wider placeholder:text-[10px]"
              )}
              rows={1}
              disabled={sendingMessage}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-40 hover:opacity-100 hover:bg-primary/10 transition-all">
                <Smile className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <Button
              size="icon"
              className={cn(
                "h-12 w-12 flex-shrink-0 rounded-full shadow-2xl transition-all duration-500",
                newMessage.trim() 
                  ? "bg-primary text-primary-foreground shadow-primary/30 border-none scale-105" 
                  : "bg-muted text-muted-foreground opacity-50 border border-white/5"
              )}
              onClick={onSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className={cn("w-5 h-5 transition-all duration-300", newMessage.trim() && "translate-x-0.5 -translate-y-0.5 rotate-[15deg]")} />
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
}
