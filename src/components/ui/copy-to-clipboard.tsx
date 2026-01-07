import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UseCopyToClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  resetDelay?: number;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const {
    successMessage = 'Copiado!',
    errorMessage = 'Erro ao copiar',
    resetDelay = 2000,
  } = options;

  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);
      
      setTimeout(() => {
        setCopied(false);
      }, resetDelay);
      
      return true;
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopied(true);
        toast.success(successMessage);
        
        setTimeout(() => {
          setCopied(false);
        }, resetDelay);
        
        return true;
      } catch (fallbackError) {
        toast.error(errorMessage);
        return false;
      }
    }
  }, [successMessage, errorMessage, resetDelay]);

  return { copy, copied };
}

// Copy button component
interface CopyButtonProps {
  value: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function CopyButton({ 
  value, 
  className,
  size = 'md',
  variant = 'ghost'
}: CopyButtonProps) {
  const { copy, copied } = useCopyToClipboard();

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={() => copy(value)}
      className={cn(sizeClasses[size], className)}
    >
      {copied ? (
        <Check className={cn(iconSizes[size], "text-green-500")} />
      ) : (
        <Copy className={iconSizes[size]} />
      )}
    </Button>
  );
}

// Copyable text component
interface CopyableTextProps {
  text: string;
  displayText?: string;
  className?: string;
  showButton?: boolean;
  truncate?: boolean;
  maxLength?: number;
}

export function CopyableText({
  text,
  displayText,
  className,
  showButton = true,
  truncate = false,
  maxLength = 50,
}: CopyableTextProps) {
  const { copy, copied } = useCopyToClipboard();

  const display = displayText || text;
  const truncatedDisplay = truncate && display.length > maxLength
    ? `${display.slice(0, maxLength)}...`
    : display;

  return (
    <div 
      className={cn(
        "group inline-flex items-center gap-1.5",
        !showButton && "cursor-pointer",
        className
      )}
      onClick={!showButton ? () => copy(text) : undefined}
    >
      <span 
        className={cn(
          "font-mono",
          !showButton && "hover:text-primary transition-colors"
        )}
        title={truncate ? display : undefined}
      >
        {truncatedDisplay}
      </span>
      
      {showButton && (
        <CopyButton 
          value={text} 
          size="sm" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
      
      {!showButton && copied && (
        <Check className="w-3 h-3 text-green-500" />
      )}
    </div>
  );
}

// Code block with copy
interface CopyableCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CopyableCodeBlock({
  code,
  language = 'text',
  className,
  showLineNumbers = false,
}: CopyableCodeBlockProps) {
  const { copy, copied } = useCopyToClipboard();
  const lines = code.split('\n');

  return (
    <div className={cn("relative group rounded-lg border bg-muted", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copy(code)}
          className="h-7 text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1.5 text-green-500" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1.5" />
              Copiar
            </>
          )}
        </Button>
      </div>
      <pre className="p-4 overflow-auto text-sm">
        <code>
          {showLineNumbers ? (
            lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-muted-foreground select-none text-right pr-4">
                  {i + 1}
                </span>
                <span>{line}</span>
              </div>
            ))
          ) : (
            code
          )}
        </code>
      </pre>
    </div>
  );
}
