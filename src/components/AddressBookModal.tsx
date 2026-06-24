import { useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { MapPin } from '../lib/icons';
import { supabase } from '../lib/supabase';
import ModalCloseButton from './ModalCloseButton';
import { useErrorToast } from './ErrorToastProvider';

interface Props {
  user: User;
  onClose: () => void;
  onUpdated: () => void;
}

export default function AddressBookModal({ user, onClose, onUpdated }: Props) {
  const { showError } = useErrorToast();
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [dirtyAddresses, setDirtyAddresses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'physical' | 'web' | 'email' | 'phone'>('physical');

  useEffect(() => {
    async function loadAddresses() {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('location')
        .eq('user_id', user.id)
        .not('location', 'is', null);

      setLoading(false);
      if (error) {
        showError(error.message);
        return;
      }

      const unique = [...new Set((data ?? []).map((row) => row.location).filter(Boolean))]
        .map((value) => String(value).trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

      setAddresses(unique);
      setDraftValues(Object.fromEntries(unique.map((address) => [address, address])));
    }

    loadAddresses();
  }, [user.id, showError]);

  const hasAddresses = useMemo(() => addresses.length > 0, [addresses]);

  const categorizedAddresses = useMemo(() => {
    const web: string[] = [];
    const email: string[] = [];
    const phone: string[] = [];
    const physical: string[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const webRegex = /^(https?:\/\/|www\.)\S+$|^[^\s@]+\.[a-z]{2,}(?:\/\S*)?$/i;
    const phoneNumberFirstRegex = /^\+?[\d\s().-]{7,}\s*-\s*.+$/;
    const phoneNameFirstRegex = /^.+\s\/\s\+?[\d\s().-]{7,}$/;

    for (const address of addresses) {
      const value = address.trim();
      if (!value) continue;

      if (emailRegex.test(value)) {
        email.push(value);
        continue;
      }

      if (webRegex.test(value)) {
        web.push(value);
        continue;
      }

      if (phoneNumberFirstRegex.test(value) || phoneNameFirstRegex.test(value)) {
        phone.push(value);
        continue;
      }

      physical.push(value);
    }

    return [
      { key: 'physical', title: 'Adresses physiques', items: physical },
      { key: 'web', title: 'Adresses web', items: web },
      { key: 'email', title: 'Courriels', items: email },
      { key: 'phone', title: 'Téléphone', items: phone },
    ] as const;
  }, [addresses]);

  const activeGroup = categorizedAddresses.find((group) => group.key === activeTab) ?? categorizedAddresses[0];
  const emptyMessages: Record<typeof activeGroup.key, string> = {
    physical: 'Aucune adresse à afficher',
    web: 'Aucun site internet à afficher',
    email: 'Aucun courriel à afficher',
    phone: 'Aucun téléphone à afficher',
  };

  function getDisplayedAddress(address: string) {
    const draft = (draftValues[address] ?? '').trim();
    return dirtyAddresses.includes(address) && draft ? draft : address;
  }

  function startEditing(address: string) {
    setEditingAddress(address);
    setDraftValues((prev) => ({ ...prev, [address]: prev[address] ?? address }));
  }

  function cancelEditing() {
    setEditingAddress(null);
  }

  function markDirty(address: string, nextValue: string) {
    const normalized = nextValue.trim();
    const isDirty = normalized !== address;
    setDirtyAddresses((prev) => {
      if (isDirty && !prev.includes(address)) return [...prev, address];
      if (!isDirty && prev.includes(address)) return prev.filter((a) => a !== address);
      return prev;
    });
  }

  async function handleConfirmAll() {
    if (dirtyAddresses.length === 0) {
      onClose();
      return;
    }

    const updates = dirtyAddresses
      .map((address) => ({ original: address, next: (draftValues[address] ?? '').trim() }))
      .filter((item) => item.next && item.next !== item.original);

    if (updates.some((item) => !item.next)) {
      showError('L’adresse ne peut pas être vide.');
      return;
    }

    setSaving(true);
    for (const item of updates) {
      const { error } = await supabase
        .from('tasks')
        .update({ location: item.next })
        .eq('user_id', user.id)
        .eq('location', item.original);

      if (error) {
        setSaving(false);
        showError(error.message);
        return;
      }
    }

    setSaving(false);
    onUpdated();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col scrollbar-hide"
        style={{
          transform: 'translateX(0)',
          borderLeft: '4px solid #1a1a1a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper shrink-0">
          <h2 className="font-display text-lg uppercase">Carnet d'adresses</h2>
          <ModalCloseButton onClose={onClose} className="text-paper p-1" />
        </div>

        <div className="relative z-20 p-6 space-y-10 overflow-visible flex-1 overflow-y-auto scrollbar-hide" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <section className="space-y-4">
            {loading ? (
              <p className="text-xs font-bold opacity-75">Chargement des adresses...</p>
            ) : !hasAddresses ? (
              <p className="text-xs font-bold opacity-75">Aucune adresse trouvée dans les tâches.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 -mt-1 w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab('physical')}
                    className={`retro-btn w-full text-xs px-2 py-3 min-h-[44px] whitespace-nowrap ${activeTab === 'physical' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                  >
                    Adresses
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('web')}
                    className={`retro-btn w-full text-xs px-2 py-3 min-h-[44px] whitespace-nowrap ${activeTab === 'web' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                  >
                    Sites internet
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className={`retro-btn w-full text-xs px-2 py-3 min-h-[44px] whitespace-nowrap ${activeTab === 'email' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                  >
                    Courriels
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('phone')}
                    className={`retro-btn w-full text-xs px-2 py-3 min-h-[44px] whitespace-nowrap ${activeTab === 'phone' ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                  >
                    Téléphone
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  {activeGroup.items.length === 0 ? (
                    <div className="min-h-[320px] flex items-center justify-center">
                      <p className="text-sm font-bold opacity-50">{emptyMessages[activeGroup.key]}</p>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {activeGroup.items.map((address) => (
                        <li key={address} className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 text-sm font-bold min-w-0 flex-1">
                            <MapPin size={13} className="shrink-0" />
                            {editingAddress === address ? (
                              <input
                                type="text"
                                value={draftValues[address] ?? address}
                                onChange={(e) => {
                                  setDraftValues((prev) => ({ ...prev, [address]: e.target.value }));
                                  markDirty(address, e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    cancelEditing();
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelEditing();
                                  }
                                }}
                                autoFocus
                                className="w-full bg-transparent text-sm font-mono border-0 border-b-2 border-ink-red focus:border-ink-red outline-none py-0.5"
                              />
                            ) : (
                              <span className="truncate">{getDisplayedAddress(address)}</span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => (editingAddress === address ? cancelEditing() : startEditing(address))}
                              className={`retro-btn px-3 py-1.5 transition-colors ${editingAddress === address || dirtyAddresses.includes(address) ? 'bg-ink-red text-paper hover:bg-ink-red' : 'bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper'}`}
                            >
                              Éditer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="px-6 pb-6 pt-6 border-t-4 border-ink-black" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmAll}
              disabled={saving}
              className="retro-btn flex-1 py-3 bg-[var(--theme-background)] text-ink-black hover:bg-ink-red hover:text-paper transition-colors"
            >
              Confirmer
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
