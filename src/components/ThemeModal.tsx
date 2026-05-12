import { DEFAULT_THEME, THEMES, ThemeId } from '../lib/themes';
import ModalCloseButton from './ModalCloseButton';

interface Props {
  open: boolean;
  selectedTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  onClose: () => void;
}

// Ordered by CTA color progression (warm -> cool -> neutral)
const ORDER: ThemeId[] = [
  'crimson-harbor',
  'raspberry-silk',
  'terracotta-rain',
  'desert-bloom',
  'soft-linen',
  'honey-oat',
  'sage-ritual',
  'spring-meadow',
  'mint-frequency',
  'coastal-fog',
  'arctic-glass',
  'lavender-mist',
  'lavender-smoke',
  'ink-wash',
];

export default function ThemeModal({ open, selectedTheme = DEFAULT_THEME, onSelectTheme, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col scrollbar-hide"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '4px solid #1a1a1a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper">
          <h2 className="font-display text-lg uppercase">Choisir un thème</h2>
          <ModalCloseButton onClose={onClose} className="text-paper p-1" />
        </div>

        <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="grid grid-cols-2 gap-4 content-start">
            {ORDER.map((themeId) => {
              const theme = THEMES[themeId];
              const isSelected = themeId === selectedTheme;
              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => onSelectTheme(themeId)}
                  className="w-full text-left border-2 border-ink-black p-0 transition-all"
                  style={{
                    boxShadow: isSelected
                      ? '3px 3px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)'
                      : '1px 1px 0 color-mix(in srgb, var(--theme-primary-text) 45%, transparent)',
                    backgroundColor: isSelected ? 'var(--theme-background)' : 'color-mix(in srgb, var(--theme-background) 84%, var(--theme-surface) 16%)',
                  }}
                >
                  <div className="grid grid-cols-[1fr_26px] grid-rows-3 h-[54px] overflow-hidden">
                    <div
                      className="row-span-3 flex items-center justify-center px-1.5 border-r-2 border-ink-black"
                      style={{ backgroundColor: isSelected ? theme.palette.cta : 'transparent' }}
                    >
                      <div className="text-center leading-none">
                          <h3 className={`font-display text-[11px] uppercase ${isSelected ? 'text-paper' : ''}`}>{theme.name}</h3>
                      </div>
                    </div>
                    <span className="border-b-2 border-ink-black" style={{ backgroundColor: theme.palette.cta }} title="CTA" />
                    <span className="border-b-2 border-ink-black" style={{ backgroundColor: theme.palette.surface }} title="Surface" />
                    <span style={{ backgroundColor: theme.palette.background }} title="Background" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t-2 border-ink-black" style={{ backgroundColor: 'var(--theme-background)' }}>
          <button onClick={onClose} className="retro-btn w-full bg-transparent text-ink-black hover:bg-ink-red hover:text-paper transition-colors">
            Fermer
          </button>
        </div>
      </aside>
    </>
  );
}
