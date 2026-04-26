import { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  user: User;
  onProfileClick: () => void;
}

export default function UserMenu({ user, onProfileClick }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-ink-black text-paper px-4 py-2 font-mono font-bold text-xs flex items-center gap-2 transition-all duration-150 hover:opacity-80 active:opacity-70"
        style={{ boxShadow: '3px 3px 0 #457b9d' }}
        title="User menu"
      >
        {user.email?.toUpperCase()}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 border-2 border-ink-black bg-paper flex flex-col z-50"
          style={{ boxShadow: '4px 4px 0 #1a1a1a', transform: 'rotate(0.5deg)' }}
        >
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 px-4 py-3 border-b-2 border-ink-black hover:bg-ink-black hover:text-paper transition-colors duration-150 text-left text-sm font-bold uppercase"
          >
            <UserIcon size={16} />
            Profile
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 hover:bg-ink-red hover:text-paper transition-colors duration-150 text-left text-sm font-bold uppercase"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
