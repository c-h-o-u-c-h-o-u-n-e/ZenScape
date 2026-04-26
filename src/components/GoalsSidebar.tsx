import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { Goal, Task } from '../types';
import { getGoalColor } from '../lib/goalColors';

function MenuIcon({ src, size = 12 }: { src: string; size?: number }) {
  return (
    <span
      className="shrink-0 inline-block"
      style={{
        width: size,
        height: size,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: 'currentColor',
      }}
    />
  );
}

interface Props {
  goals: Goal[];
  tasks: Task[];
  onNewGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
  onUnarchiveGoal: (goalId: string) => void;
  onViewArchives: (goal: Goal) => void;
  onFilterChange?: (filter: 'all' | 'active' | 'archived') => void;
}

function lightenHex(hex: string, amount = 60): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function GoalItem({ goal, tasks, onEditGoal, onDeleteGoal, onArchiveGoal, onUnarchiveGoal, onViewArchives }: {
  goal: Goal;
  tasks: Task[];
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
  onUnarchiveGoal: (goalId: string) => void;
  onViewArchives: (goal: Goal) => void;
}) {
  const color = getGoalColor(goal.id, goal.color);
  const archivedCount = tasks.filter(t => t.goal_id === goal.id && t.archived).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpenUp, setMenuOpenUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inCard = cardRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inCard && !inPortal) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 150;
      setMenuOpenUp(openUp);
      setMenuPos({
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: rect.width,
      });
    }
    setMenuOpen(o => !o);
  };

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/goal-id', goal.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  const goalTasks = tasks.filter(t => t.goal_id === goal.id && !t.archived);
  const done = goalTasks.filter(t => t.status === 'done').length;
  const pct = goalTasks.length > 0 ? Math.round((done / goalTasks.length) * 100) : 0;

  const isArchived = goal.status === 'archived' || goal.status === 'completed';

  const menuItems = [
    ...(!isArchived ? [{ label: 'Modifier', icon: <MenuIcon src="/icons/pen.svg" size={11} />, danger: false, action: () => { setMenuOpen(false); onEditGoal(goal); } }] : []),
    { label: 'Tâches complétées', icon: <MenuIcon src="/icons/box-archive.svg" size={11} />, badge: archivedCount > 0 ? (archivedCount > 9 ? '9+' : String(archivedCount)) : null, danger: false, action: () => { setMenuOpen(false); onViewArchives(goal); } },
    ...(!isArchived
      ? [{ label: 'Archiver', icon: <MenuIcon src="/icons/folder-arrow-down.svg" size={11} />, danger: false, action: () => { setMenuOpen(false); onArchiveGoal(goal.id); } }]
      : [{ label: 'Désarchiver', icon: <MenuIcon src="/icons/folder-arrow-down.svg" size={11} />, danger: false, action: () => { setMenuOpen(false); onUnarchiveGoal(goal.id); } }]
    ),
    { label: 'Supprimer', icon: <MenuIcon src="/icons/trash-can.svg" size={11} />, danger: true, action: () => { setMenuOpen(false); onDeleteGoal(goal.id); } },
  ];

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onClick={handleMenuClick}
      className="border-2 border-ink-black cursor-pointer group relative"
      style={{
        boxShadow: '4px 4px 0 #1a1a1a',
        backgroundColor: color.bg,
        color: color.fg,
      }}
    >
      <div className="px-2.5 py-1.5 flex items-center gap-2" ref={menuRef}>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[11px] truncate leading-tight">{goal.title}</p>
          {goal.end_date && (
            <p className="text-[8px] mt-0.5 opacity-60 font-bold">
              {new Date(goal.end_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            ref={btnRef}
            onClick={handleMenuClick}
            className="p-1 hover:opacity-60 transition-opacity cursor-pointer"
            title="Options"
          >
            <MoreVertical size={12} />
          </button>
          {menuOpen && menuPos && createPortal(
            <div
              ref={portalRef}
              className="fixed z-[9999] border-2 border-ink-black flex flex-col"
              style={{
                boxShadow: '4px 4px 0 #1a1a1a',
                backgroundColor: lightenHex(color.bg),
                top: menuPos.top !== undefined ? `${menuPos.top}px` : 'auto',
                bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : 'auto',
                left: `${menuPos.left}px`,
                width: `${menuPos.width}px`,
                minWidth: '120px',
              }}
            >
              {menuItems.map(item => (
                <button
                  key={item.label}
                  onClick={e => { e.stopPropagation(); item.action(); }}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-left text-ink-black transition-colors duration-150 border-b border-ink-black last:border-b-0"
                  style={{ backgroundColor: lightenHex(color.bg) }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = color.bg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = lightenHex(color.bg))}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="font-mono text-[10px] font-bold leading-none text-ink-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoalsSidebar({ goals, tasks, onNewGoal, onEditGoal, onDeleteGoal, onArchiveGoal, onUnarchiveGoal, onViewArchives, onFilterChange }: Props) {
  const active = goals.filter(g => g.status === 'active').sort((a, b) => a.title.localeCompare(b.title));
  const completed = goals.filter(g => g.status === 'completed').sort((a, b) => a.title.localeCompare(b.title));
  const archived = goals.filter(g => g.status === 'archived').sort((a, b) => a.title.localeCompare(b.title));
  const archiveGoals = [...completed, ...archived];

  const [expandedArchive, setExpandedArchive] = useState(false);
  const [filterView, setFilterView] = useState<'all' | 'active' | 'archived'>('active');

  const cardProps = { tasks, onEditGoal, onDeleteGoal, onArchiveGoal, onUnarchiveGoal, onViewArchives };

  return (
    <div className="flex flex-col border-2 border-ink-black h-full bg-ink-red/75" style={{ boxShadow: '4px 4px 0 #1a1a1a' }}>
      {/* Header */}
      <div className="bg-ink-red text-paper px-4 py-3 border-b-2 border-ink-black flex items-center gap-2 shrink-0">
        <h3 className="font-display text-base uppercase font-bold">Projets</h3>
        <span className="ml-auto font-mono text-sm font-bold text-paper opacity-80 tabular-nums">{goals.length}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-0 scrollbar-hide" style={{ overflowX: 'visible' }}>
        {/* Filter buttons */}
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => setFilterView('active')}
            className={`flex-1 px-1.5 py-1 text-[11px] font-bold uppercase tracking-wider border-2 border-ink-black transition-all duration-150 ${
              filterView === 'active'
                ? 'bg-ink-blue text-paper'
                : 'bg-paper text-ink-black hover:bg-paper'
            }`}
            style={{
              boxShadow: '2px 2px 0 #1a1a1a'
            }}
          >
            En cours
          </button>
          <button
            onClick={() => setFilterView('archived')}
            className={`flex-1 px-1.5 py-1 text-[11px] font-bold uppercase tracking-wider border-2 border-ink-black transition-all duration-150 ${
              filterView === 'archived'
                ? 'bg-ink-blue text-paper'
                : 'bg-paper text-ink-black hover:bg-paper'
            }`}
            style={{
              boxShadow: '2px 2px 0 #1a1a1a'
            }}
          >
            Archives
          </button>
        </div>

        {/* Active projects */}
        {(filterView === 'all' || filterView === 'active') && active.map(g => <GoalItem key={g.id} goal={g} {...cardProps} />)}

        {/* Archived projects */}
        {filterView === 'archived' && archiveGoals.map(g => <GoalItem key={g.id} goal={g} {...cardProps} />)}


        {goals.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[8px] opacity-30 uppercase tracking-wide text-center">Aucun projet</p>
          </div>
        )}
      </div>

      {/* Add button */}
      <button
        onClick={onNewGoal}
        className="mx-3 mb-3 mt-1 retro-btn bg-ink-blue text-paper text-sm font-bold"
      >
        Nouveau projet
      </button>
    </div>
  );
}
