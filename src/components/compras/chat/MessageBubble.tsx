import { motion } from "framer-motion";
import { 
  FileText, 
  Check, 
  CheckCheck 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns/format";
import { Badge } from "@/components/ui/badge";
import { ptBR } from "date-fns/locale/pt-BR";

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

interface MessageBubbleProps {
  message: Message;
  index: number;
  isMe: boolean;
  showDate: boolean;
}

export const MessageBubble = ({ message, index, isMe, showDate }: MessageBubbleProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ 
        type: "spring", 
        damping: 20, 
        stiffness: 400,
        delay: Math.min(index * 0.05, 0.5) 
      }}
      className="w-full"
    >
      {showDate && (
        <div className="flex justify-center my-8">
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.3em] bg-muted/20 border-none text-muted-foreground/60 px-4 py-1.5 rounded-full backdrop-blur-xl">
            {format(message.timestamp, "dd 'de' MMMM", { locale: ptBR })}
          </Badge>
        </div>
      )}
      
      <div className={cn("flex group items-end gap-2 mb-1", isMe ? "flex-row-reverse" : "flex-row")}>
        <div className={cn(
          "max-w-[75%] space-y-1 relative",
          isMe ? "items-end" : "items-start"
        )}>
          <div className={cn(
            "relative px-4 py-3 shadow-2xl transition-all duration-500",
            "rounded-[1.5rem]",
            isMe 
              ? "bg-gradient-to-br from-primary via-primary-glow to-primary text-primary-foreground rounded-br-[0.25rem] shadow-primary/20" 
              : "bg-card/80 backdrop-blur-xl border border-white/10 text-foreground rounded-bl-[0.25rem] shadow-black/20"
          )}>
            {message.type === 'file' && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors border", 
                isMe ? "bg-white/10 border-white/10" : "bg-primary/5 border-primary/10"
              )}>
                <div className={cn(
                  "p-2.5 rounded-lg shadow-inner",
                  isMe ? "bg-white/20" : "bg-primary/10 text-primary"
                )}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate leading-none">{message.attachmentName}</p>
                  <p className={cn("text-[10px] mt-1.5 font-bold uppercase tracking-wider opacity-70", isMe ? "text-white" : "text-muted-foreground")}>
                    DOC • 2.4 MB
                  </p>
                </div>
              </div>
            )}
            
            {message.type !== 'file' && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium tracking-tight">
                {message.content}
              </p>
            )}
            
            <div className={cn(
              "flex items-center gap-1.5 mt-2", 
              isMe ? "justify-end" : "justify-start"
            )}>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest", 
                isMe ? "text-primary-foreground/50" : "text-muted-foreground/40"
              )}>
                {format(message.timestamp, 'HH:mm')}
              </span>
              {isMe && (
                <div className="flex ml-1">
                  {message.status === 'read' ? (
                    <CheckCheck className="w-3 h-3 text-primary-foreground animate-pulse" />
                  ) : (
                    <Check className="w-3 h-3 text-primary-foreground/40" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
