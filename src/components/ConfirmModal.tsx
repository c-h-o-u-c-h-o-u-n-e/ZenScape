import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ModalCloseButton from './ModalCloseButton';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-[10000] p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="retro-card w-full max-w-md bg-paper" style={{ boxShadow: '8px 8px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper">
          <h2 className="font-display text-lg uppercase">{title}</h2>
          <ModalCloseButton onClose={onCancel} className="text-paper" />
        </div>

        <div className="p-6 flex flex-col gap-6" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <p className="text-sm text-ink-black leading-relaxed">{message}</p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="retro-btn bg-transparent text-ink-black text-sm hover:bg-ink-red hover:text-paper transition-colors"
            >
              Annuler
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`retro-btn bg-transparent text-sm transition-colors ${danger ? 'text-ink-red hover:bg-ink-red hover:text-paper' : 'text-ink-black hover:bg-ink-red hover:text-paper'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
