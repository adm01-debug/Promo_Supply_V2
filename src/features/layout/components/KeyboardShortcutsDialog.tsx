import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { getShortcutsList } from "@/hooks/useKeyboardShortcuts";
import { ClearFiltersShortcutEditor } from "./ClearFiltersShortcutEditor";
import { subscribeToShortcutChanges } from "@/lib/clearFiltersShortcut";

const CLEAR_FILTERS_DESCRIPTION = "Limpar filtros (tela atual)";

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(() => getShortcutsList());

  useEffect(() => {
    const handleShowShortcuts = () => setOpen(true);
    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts);
    return () => window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts);
  }, []);

  // Refresh the displayed list when the user changes their shortcut.
  useEffect(() => subscribeToShortcutChanges(() => setShortcuts(getShortcutsList())), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item) => {
                  const isCustomizable = item.description === CLEAR_FILTERS_DESCRIPTION;
                  return (
                    <div
                      key={item.description}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 gap-3"
                    >
                      <span className="text-sm">{item.description}</span>
                      {isCustomizable ? (
                        <ClearFiltersShortcutEditor />
                      ) : (
                        <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-muted font-mono text-xs">
                          {item.keys}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t mt-4">
          <p className="text-xs text-muted-foreground text-center">
            Pressione <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">Shift + ?</kbd> a qualquer momento para ver esta lista
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
