import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (skipNextTime: boolean) => void;
  /** Lines describing what will be cleared (e.g. "Busca: orçamento") */
  filterLines: string[];
  /** Scope key, used to remember "don't ask again" preference per screen */
  scope: string;
}

export const ConfirmClearFiltersDialog = ({
  open,
  onOpenChange,
  onConfirm,
  filterLines,
  scope,
}: Props) => {
  const [skipNextTime, setSkipNextTime] = useState(false);

  useEffect(() => {
    if (open) setSkipNextTime(false);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        aria-label="Confirmar limpeza de filtros"
        className="bg-background"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar todos os filtros?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação removerá os filtros listados abaixo. Você poderá desfazer
            por alguns segundos após a confirmação.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {filterLines.length > 0 && (
          <div className="rounded-md border bg-muted/40 p-3 max-h-48 overflow-y-auto">
            <ul className="space-y-1 text-sm text-foreground">
              {filterLines.map((line, idx) => (
                <li key={`${scope}-line-${idx}`} className="flex gap-2">
                  <span aria-hidden className="text-muted-foreground">•</span>
                  <span className="break-words">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={`skip-confirm-${scope}`}
            checked={skipNextTime}
            onCheckedChange={(v) => setSkipNextTime(v === true)}
            aria-label="Não perguntar de novo nesta sessão"
          />
          <Label
            htmlFor={`skip-confirm-${scope}`}
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Não perguntar de novo nesta sessão
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            onClick={() => onConfirm(skipNextTime)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Limpar tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
