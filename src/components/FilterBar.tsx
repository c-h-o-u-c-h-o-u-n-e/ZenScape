import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from '../lib/icons';
import { Task, Filters, TaskPriority } from '../types';
import ModalCloseButton from './ModalCloseButton';

interface Props {
  filters: Filters;
  tasks: Task[];
  onChange: (f: Filters) => void;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: 'var(--priority-low-bg)', text: 'var(--priority-low-text)' },
  medium: { bg: 'var(--priority-medium-bg)', text: 'var(--priority-medium-text)' },
  high: { bg: 'var(--priority-high-bg)', text: 'var(--priority-high-text)' },
  urgent: { bg: 'var(--priority-urgent-bg)', text: 'var(--priority-urgent-text)' },
};

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const FILTER_BUTTON_CLASS = 'retro-btn h-[34px] px-3 py-0 text-sm font-bold font-display uppercase inline-flex items-center';
const TAG_CHIP_CLASS = 'retro-btn retro-btn-no-press h-[34px] px-3 py-0 text-sm font-bold font-display uppercase inline-flex items-center';

export default function FilterBar({ filters, tasks, onChange }: Props) {
  const [tagsSidebarOpen, setTagsSidebarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const allTags = [...new Set(tasks.flatMap(t => t.tags))].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );
  const activeTags = filters.tags ?? [];
  const hasActiveTags = activeTags.length > 0;
  const [showTagsSection, setShowTagsSection] = useState(hasActiveTags);
  const [tagsSectionVisible, setTagsSectionVisible] = useState(hasActiveTags);
  const [exitingTags, setExitingTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (hasActiveTags) {
      setShowTagsSection(true);
      requestAnimationFrame(() => setTagsSectionVisible(true));
      return;
    }

    setTagsSectionVisible(false);
    setShowTagsSection(false);
  }, [hasActiveTags]);

  useEffect(() => {
    setExitingTags(prev => {
      const next = new Set<string>();
      for (const tag of prev) {
        if (activeTags.includes(tag)) next.add(tag);
      }
      // Only update state if there's an actual change
      if (next.size === prev.size && [...next].every(tag => prev.has(tag))) {
        return prev;
      }
      return next;
    });
  }, [activeTags]);

  function handleRemoveTag(tag: string) {
    if (exitingTags.has(tag)) return;

    setExitingTags(prev => new Set(prev).add(tag));

    window.setTimeout(() => {
      const currentTags = filters.tags ?? [];
      const newTags = currentTags.filter(t => t !== tag);
      onChange({ ...filters, tags: newTags.length > 0 ? newTags : null });

      setExitingTags(prev => {
        const next = new Set(prev);
        next.delete(tag);
        return next;
      });
    }, 300);
  }

  function updateScrollButtons() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setHasOverflow(maxScrollLeft > 2);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 2);
  }

  function scrollFilters(direction: 'left' | 'right') {
    const el = scrollContainerRef.current;
    if (!el) return;
    const delta = 180;
    el.scrollBy({ left: direction === 'left' ? -delta : delta, behavior: 'smooth' });
  }

  useEffect(() => {
    updateScrollButtons();
    const onResize = () => updateScrollButtons();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTags.length, filters.priority]);

  return (
    <>
      <div className="w-full min-w-0 h-[42px] flex items-center gap-2">
        <span className="text-[11px] font-bold opacity-90 shrink-0 pr-2">Filtres de priorité :</span>

        <div
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          className="flex-1 min-w-0 overflow-x-auto scrollbar-hide"
        >
          <div className="h-[42px] flex items-center gap-2 w-max pr-2">
          {PRIORITIES.map(p => {
            const colors = PRIORITY_COLORS[p];
            const isActive = filters.priority?.includes(p) ?? false;
            return (
              <button
                key={p}
                onClick={() => {
                  const currentPriorities = filters.priority ?? [];
                  const newPriorities = isActive
                    ? currentPriorities.filter(pr => pr !== p)
                    : [...currentPriorities, p];
                  onChange({ ...filters, priority: newPriorities.length > 0 ? newPriorities : null });
                }}
                className={FILTER_BUTTON_CLASS}
                style={{
                  backgroundColor: isActive ? colors.bg : 'var(--theme-background)',
                  color: '#1a1a1a',
                }}
              >
                {PRIORITY_LABELS[p]}
              </button>
            );
          })}

            {showTagsSection && (
              <div
                className="flex items-center gap-2 ml-12 transition-opacity duration-300 ease-in-out"
                style={{
                  opacity: tagsSectionVisible ? 1 : 0,
                  pointerEvents: tagsSectionVisible ? 'auto' : 'none',
                }}
              >
                <span className="text-[11px] font-bold opacity-90 shrink-0 mr-2 whitespace-nowrap">Tags actifs :</span>

                {activeTags.map(tag => {
                  const isExiting = exitingTags.has(tag);
                  return (
                    <button
                      type="button"
                      key={`active-tag-${tag}`}
                      onClick={() => handleRemoveTag(tag)}
                      className={`${TAG_CHIP_CLASS} gap-2.5 shrink-0 transition-opacity duration-300`}
                      style={{
                        backgroundColor: 'var(--theme-cta)',
                        color: 'var(--theme-background)',
                        boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                        opacity: isExiting ? 0 : 1,
                      }}
                      title="Retirer ce tag actif"
                      aria-label={`Retirer le tag ${tag}`}
                    >
                      <span>{tag}</span>
                      <span className="inline-flex items-center justify-center" aria-hidden="true">
                        <X size={12} strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {hasOverflow && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => scrollFilters('left')}
              disabled={!canScrollLeft}
              className="retro-btn h-[34px] w-[34px] p-0 inline-flex items-center justify-center disabled:opacity-40"
              title="Défiler à gauche"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scrollFilters('right')}
              disabled={!canScrollRight}
              className="retro-btn h-[34px] w-[34px] p-0 inline-flex items-center justify-center disabled:opacity-40"
              title="Défiler à droite"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {allTags.length > 0 && (
          <button
            onClick={() => setTagsSidebarOpen(true)}
            className={`${FILTER_BUTTON_CLASS} shrink-0`}
            style={{
              backgroundColor: 'var(--theme-cta)',
              color: 'var(--theme-background)',
            }}
          >
            Répertoire des tags
          </button>
        )}
      </div>

      {tagsSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={() => setTagsSidebarOpen(false)} />
      )}

      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col scrollbar-hide"
        style={{
          transform: tagsSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '4px solid #1a1a1a',
        }}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper sticky top-0">
          <h2 className="font-display text-lg uppercase">Filtrer par tags</h2>
          <ModalCloseButton onClose={() => setTagsSidebarOpen(false)} className="text-paper p-1" />
        </div>

        <div className="flex-1 p-5 flex flex-wrap gap-3 content-start overflow-y-auto scrollbar-hide" style={{ backgroundColor: 'var(--theme-surface)' }}>
          {allTags.map(tag => {
            const isActive = filters.tags?.includes(tag) ?? false;
            return (
              <button
                key={tag}
                onClick={() => {
                  const currentTags = filters.tags ?? [];
                  const newTags = isActive
                    ? currentTags.filter(t => t !== tag)
                    : [...currentTags, tag];
                  onChange({ ...filters, tags: newTags.length > 0 ? newTags : null });
                }}
                className="retro-btn h-[34px] px-3 py-0 text-xs font-bold uppercase inline-flex items-center"
                style={{
                  backgroundColor: isActive ? 'var(--theme-cta)' : 'var(--theme-background)',
                  color: isActive ? 'var(--theme-background)' : '#1a1a1a',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
