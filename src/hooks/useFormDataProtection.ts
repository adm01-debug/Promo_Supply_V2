import { useFormContext } from "react-hook-form";
import { useEffect } from "react";

/**
 * Hook to protect forms from unsaved changes.
 * Shows a browser confirmation dialog if the user tries to navigate away or close the tab while the form is dirty.
 */
export const useFormDataProtection = (isDirtyOverride?: boolean) => {
  const formContext = useFormContext();
  const isDirty = isDirtyOverride ?? formContext?.formState?.isDirty ?? false;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  return { isDirty };
};
