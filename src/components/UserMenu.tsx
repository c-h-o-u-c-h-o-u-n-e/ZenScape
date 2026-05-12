import { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, ChevronDown, Palette } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

interface Props {
  user: User;
  onProfileClick: () => void;
  onThemeClick: () => void;
}

export default function UserMenu({ user, onProfileClick, onThemeClick }: Props) {
  const [open, setOpen] = useState(false);
  const triggerBg = 'var(--theme-cta)';
  const menuBaseColor = triggerBg;
  const menuBg = 'color-mix(in srgb, var(--theme-cta) 34%, var(--theme-background))';
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inMenu = menuRef.current?.contains(target);
      const inPortal = menuPortalRef.current?.contains(target);
      if (!inMenu && !inPortal) {
        setOpen(false);
        setMenuPosition(null);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleProfileClick = () => {
    setOpen(false);
    onProfileClick();
  };

  const handleLogout = () => {
    setOpen(false);
    supabase.auth.signOut();
  };

  const handleThemeClick = () => {
    setOpen(false);
    onThemeClick();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => {
          if (open) {
            setOpen(false);
            setMenuPosition(null);
            return;
          }

          if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const estimatedMenuHeight = 140;
            const spaceBelowViewport = window.innerHeight - rect.bottom;
            const openUp = spaceBelowViewport < estimatedMenuHeight;

            setMenuPosition({
              top: openUp ? undefined : rect.bottom + 6,
              bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
              // Aligne strictement la bordure droite du menu sur la bordure droite du bouton.
              right: window.innerWidth - rect.right,
            });
          }

          setOpen(true);
        }}
        className="h-[36px] px-4 border-2 border-ink-black text-paper font-bold text-sm uppercase leading-none whitespace-nowrap flex items-center gap-2 transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px]"
        style={{ appearance: 'none', backgroundColor: triggerBg, boxShadow: open ? '1px 1px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)' : '3px 3px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)', transform: open ? 'translate(1px, 1px)' : 'translate(0, 0)' }}
        title="User menu"
      >
        {user.email?.toUpperCase()}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && menuPosition && createPortal(
        <div
          ref={menuPortalRef}
          className="fixed min-w-[150px] border-2 border-ink-black z-[9999]"
          style={{
            boxShadow: '4px 4px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)',
            top: menuPosition.top !== undefined ? `${menuPosition.top}px` : 'auto',
            bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : 'auto',
            right: `${menuPosition.right}px`,
            backgroundColor: menuBg,
            color: 'var(--theme-primary-text)',
          }}
        >
          <button
            onClick={handleProfileClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors"
            style={{ backgroundColor: menuBg, color: 'var(--theme-primary-text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = menuBaseColor;
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = menuBg;
              e.currentTarget.style.color = 'var(--theme-primary-text)';
            }}
          >
            <UserIcon size={14} />
            Profil
          </button>
          <button
            onClick={handleThemeClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors"
            style={{ backgroundColor: menuBg, color: 'var(--theme-primary-text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = menuBaseColor;
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = menuBg;
              e.currentTarget.style.color = 'var(--theme-primary-text)';
            }}
          >
            <Palette size={14} />
            Thèmes
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors"
            style={{ backgroundColor: menuBg, color: 'var(--theme-primary-text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = menuBaseColor;
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = menuBg;
              e.currentTarget.style.color = 'var(--theme-primary-text)';
            }}
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
