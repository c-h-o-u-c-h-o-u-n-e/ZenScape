import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { X, Mail, Calendar, User as UserIcon } from 'lucide-react';

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    darkMode: false,
    recurringTasks: true,
  });

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const toggleSetting = (key: keyof typeof userSettings) => {
    setUserSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-paper border-2 border-ink-black w-full max-w-md" style={{ boxShadow: '6px 6px 0 #1a1a1a' }}>
        {/* Header */}
        <div className="bg-ink-black text-paper px-6 py-4 flex items-center justify-between border-b-2 border-ink-black">
          <h2 className="font-display text-xl uppercase font-bold">User Profile</h2>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity p-1"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-20 h-20 border-2 border-ink-black bg-ink-red text-paper flex items-center justify-center text-3xl font-bold font-display"
              style={{ boxShadow: '3px 3px 0 #1a1a1a' }}
            >
              {getInitials(user.email || '')}
            </div>
            <div className="text-center">
              <p className="font-display text-sm uppercase font-bold text-ink-black">Active Account</p>
              <p className="text-xs text-ink-black opacity-70 mt-1">{user.email}</p>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3 border-t-2 border-ink-black border-b-2 pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-ink-red flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold opacity-70">Email</p>
                <p className="text-xs font-mono break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-ink-blue flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold opacity-70">Member Since</p>
                <p className="text-xs font-bold">{createdDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon size={16} className="text-ink-teal flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold opacity-70">User ID</p>
                <p className="text-[10px] font-mono opacity-70 break-all">{user.id.substring(0, 12)}...</p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-bold opacity-70">Preferences</p>
            <div className="space-y-2">
              {[
                { key: 'notifications', label: 'Notifications' },
                { key: 'recurringTasks', label: 'Recurring Tasks' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-2 rounded-sm hover:bg-ink-black/5 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={userSettings[key as keyof typeof userSettings]}
                    onChange={() => toggleSetting(key as keyof typeof userSettings)}
                    className="w-4 h-4 accent-ink-red cursor-pointer"
                  />
                  <span className="text-xs font-bold uppercase">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-paper border-t-2 border-ink-black px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="retro-btn bg-ink-black text-paper px-4 py-2 text-xs font-bold uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
