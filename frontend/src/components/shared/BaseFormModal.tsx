import { Loader2, type LucideIcon, Save, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type React from "react";

interface BaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.SubmitEvent) => void;
  title: string;
  confirmText?: string;
  isLoading?: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
  icon?: LucideIcon;
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "3xl";
}

export default function BaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  confirmText = "Guardar",
  isLoading = false,
  submitDisabled = false,
  children,
  maxWidth = "md",
}: BaseFormModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current?.focus();

    return () => {
      const previous = previouslyFocusedRef.current;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
  };

  const isSubmitBlocked = isLoading || submitDisabled;

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (!isLoading) {
        event.stopPropagation();
        onClose();
      }
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);

    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === dialog) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || active === dialog) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={`bg-white rounded-2xl shadow-xl w-full ${maxWidthClasses[maxWidth]} overflow-hidden animate-in zoom-in-95 duration-200 focus:outline-none`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 id={titleId} className="text-lg font-semibold text-gray-800">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={isLoading}
            className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={(event) => {
            if (isSubmitBlocked) {
              event.preventDefault();
              return;
            }
            onSubmit(event);
          }}
          className="p-6 space-y-4"
        >
          <div className="max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar space-y-3">
            {children}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t border-gray-50 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all text-sm cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitBlocked}
              className="flex-1 p-2 bg-primary text-white rounded-xl hover:bg-primary-dark font-medium transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
