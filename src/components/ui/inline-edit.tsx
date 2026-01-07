import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Pencil, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | null;
}

export function InlineEdit({
  value,
  onSave,
  onCancel,
  placeholder = 'Clique para editar',
  className,
  inputClassName,
  displayClassName,
  disabled,
  required,
  maxLength,
  validate,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    if (required && !editValue.trim()) {
      setError('Campo obrigatório');
      return;
    }

    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={cn("group relative", className)}>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Small delay to allow button clicks
                  setTimeout(() => {
                    if (!isSaving) handleCancel();
                  }, 150);
                }}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={isSaving}
                className={cn(
                  "h-8",
                  error && "border-destructive",
                  inputClassName
                )}
              />
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </div>
            
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleStartEdit}
            className={cn(
              "flex items-center gap-2 cursor-pointer rounded px-2 py-1 -mx-2 transition-colors",
              !disabled && "hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50",
              displayClassName
            )}
          >
            <span className={cn(!value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
            {!disabled && (
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline edit for textarea
interface InlineTextareaEditProps extends Omit<InlineEditProps, 'maxLength'> {
  rows?: number;
  maxLength?: number;
}

export function InlineTextareaEdit({
  value,
  onSave,
  onCancel,
  placeholder = 'Clique para editar',
  className,
  disabled,
  required,
  rows = 3,
  maxLength,
  validate,
}: InlineTextareaEditProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (required && !editValue.trim()) return;
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    if (validate) {
      const error = validate(editValue);
      if (error) return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    onCancel?.();
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => !disabled && setIsEditing(true)}
        className={cn(
          "group cursor-pointer rounded p-2 transition-colors",
          !disabled && "hover:bg-muted",
          className
        )}
      >
        <span className={cn(!value && "text-muted-foreground", "whitespace-pre-wrap")}>
          {value || placeholder}
        </span>
        {!disabled && (
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 inline ml-2" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        disabled={isSaving}
        className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
