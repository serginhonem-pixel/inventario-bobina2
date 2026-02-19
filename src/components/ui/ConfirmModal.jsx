import React, { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal de confirmação customizado que substitui window.confirm().
 *
 * Props:
 *  - open        (bool)   — controla a visibilidade
 *  - title       (string) — título da modal
 *  - message     (string) — mensagem descritiva
 *  - confirmText (string) — texto do botão confirmar (padrão "Confirmar")
 *  - cancelText  (string) — texto do botão cancelar  (padrão "Cancelar")
 *  - variant     ("danger" | "warning" | "info") — altera as cores
 *  - onConfirm   (fn)     — callback ao confirmar
 *  - onCancel    (fn)     — callback ao cancelar
 */
const ConfirmModal = ({
  open,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef(null);
  const backdropRef = useRef(null);

  // Focus trap: foca o botão de confirmar ao abrir
  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  // Escape fecha a modal
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const colors = {
    danger: {
      icon: 'text-rose-500',
      iconBg: 'bg-rose-500/10',
      confirm: 'bg-rose-500 hover:bg-rose-400 text-white',
    },
    warning: {
      icon: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
      confirm: 'bg-amber-500 hover:bg-amber-400 text-black',
    },
    info: {
      icon: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      confirm: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    },
  };

  const c = colors[variant] || colors.danger;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === backdropRef.current) onCancel?.();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
              <AlertTriangle className={c.icon} size={20} />
            </div>
            <h2 id="confirm-modal-title" className="text-lg font-bold text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <p id="confirm-modal-desc" className="text-sm text-zinc-300 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${c.confirm}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
