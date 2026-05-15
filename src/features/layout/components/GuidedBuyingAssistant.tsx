import { useState } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Trash2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGuidedBuying } from '@/hooks/useGuidedBuying';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export function GuidedBuyingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setBidValue] = useState('');
  const { messages, isLoading, sendMessage, clearChat } = useGuidedBuying();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setBidValue('');
    await sendMessage(text);
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-primary to-indigo-600 hover:scale-110 transition-all z-50 group"
      >
        <Bot className="h-6 w-6 text-white group-hover:animate-bounce" />
        <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white font-bold">IA</span>
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out",
      isMinimized ? "h-14 w-64" : "h-[600px] w-[400px] max-w-[90vw]"
    )}>
      <Card className="h-full flex flex-col shadow-2xl border-2 border-primary/20 overflow-hidden">
        <CardHeader className="p-3 bg-gradient-to-r from-primary/10 to-indigo-500/10 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1">
                Guided Buying
                <Sparkles className="h-3 w-3 text-warning animate-pulse" />
              </CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Inteligência Promo Supply</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-0 bg-dot-pattern">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-10 space-y-3">
                      <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-bold text-sm">Olá! Como posso ajudar?</h3>
                      <p className="text-xs text-muted-foreground px-10">
                        Me diga o que você está procurando ou peça ajuda para criar uma solicitação.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 px-4">
                        {["Comprar Notebook", "Móveis de escritório", "Falar com suporte"].map(t => (
                          <Button key={t} variant="outline" size="sm" className="text-[10px] h-7" onClick={() => sendMessage(t)}>
                            {t}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={cn(
                      "flex",
                      m.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                        m.role === 'user' 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted text-foreground rounded-tl-none border border-border"
                      )}>
                        <div className="prose prose-sm dark:prose-invert">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-2xl rounded-tl-none border border-border flex items-center gap-2">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-card">
              <div className="flex w-full items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={clearChat} title="Limpar conversa">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <div className="relative flex-1">
                  <Input 
                    placeholder="Pergunte algo..." 
                    value={input}
                    onChange={(e) => setBidValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="pr-10 h-10"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:text-primary"
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}