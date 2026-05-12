import { useState, useRef, useEffect } from 'react';
import type { ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, ListCheck, Pen, Archive, FolderDown, Trash } from '../lib/icons';
import { Goal, Task } from '../types';
import { getGoalColor, getMenuBgFromCardColor } from '../lib/goalColors';
import { supabase } from '../lib/supabase';
import { getEstDate } from '../lib/timezone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function MenuIcon({ icon: Icon, size = 12 }: { icon: ComponentType<{ size?: number; className?: string }>; size?: number }) {
  return <Icon size={size} className="shrink-0" />;
}

interface Props {
  goals: Goal[];
  tasks: Task[];
  selectedGoalIds?: string[];
  onToggleGoalFilter?: (goalId: string) => void;
  onNewGoal: () => void;
  onCreateTaskForGoal: (goalId: string) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
  onUnarchiveGoal: (goalId: string) => void;
  onViewArchives: (goal: Goal) => void;
  onFilterChange?: (filter: 'all' | 'active' | 'archived') => void;
  onRefresh: () => void;
}

function SortableGoalItem({ goal, itemIndex, tasks, selectedGoalIds = [], onToggleGoalFilter, onCreateTaskForGoal, onEditGoal, onDeleteGoal, onArchiveGoal, onUnarchiveGoal, onViewArchives, isDragging }: {
  goal: Goal;
  itemIndex: number;
  tasks: Task[];
  selectedGoalIds?: string[];
  onToggleGoalFilter?: (goalId: string) => void;
  onCreateTaskForGoal: (goalId: string) => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
  onUnarchiveGoal: (goalId: string) => void;
  onViewArchives: (goal: Goal) => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const color = getGoalColor(goal.id, goal.color);
  const menuBg = getMenuBgFromCardColor(color.bg);
  const archivedCount = tasks.filter(t => t.goal_id === goal.id && t.archived).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inCard = cardRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inCard && !inPortal) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = itemIndex >= 9 || spaceBelow < 150;
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

  const isArchived = goal.status === 'archived' || goal.status === 'completed';
  const isFiltered = selectedGoalIds.includes(goal.id);
  const menuItems = [
    ...(!isArchived ? [{ label: 'Créer une tâche', icon: <MenuIcon icon={ListCheck} size={11} />, action: () => { setMenuOpen(false); onCreateTaskForGoal(goal.id); } }] : []),
    {
      label: 'Filtrer',
      icon: <MenuIcon icon={ListCheck} size={11} />,
      badge: isFiltered ? '✓' : null,
      action: () => {
        setMenuOpen(false);
        onToggleGoalFilter?.(goal.id);
      }
    },
    { label: 'Modifier', icon: <MenuIcon icon={Pen} size={11} />, action: () => { setMenuOpen(false); onEditGoal(goal); } },
    { label: 'Tâches terminées', icon: <MenuIcon icon={Archive} size={11} />, badge: archivedCount > 0 ? String(archivedCount) : null, action: () => { setMenuOpen(false); onViewArchives(goal); } },
    ...(!isArchived
      ? [{ label: 'Archiver', icon: <MenuIcon icon={FolderDown} size={11} />, action: () => { setMenuOpen(false); onArchiveGoal(goal.id); } }]
      : [{ label: 'Désarchiver', icon: <MenuIcon icon={FolderDown} size={11} />, action: () => { setMenuOpen(false); onUnarchiveGoal(goal.id); } }]
    ),
    { label: 'Supprimer', icon: <MenuIcon icon={Trash} size={11} />, action: () => { setMenuOpen(false); onDeleteGoal(goal.id); } },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div
        ref={cardRef}
        draggable
        onDragStart={handleDragStart}
        onClick={handleMenuClick}
        className="border-2 border-ink-black cursor-pointer group relative"
        style={{ 
          boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', 
          backgroundColor: color.bg, 
          color: color.fg,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div className="px-2.5 py-1.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[11px] truncate leading-tight">{goal.title}</p>
            {goal.end_date && (
              <p className="text-[8px] mt-0.5 opacity-60 font-bold">
                {new Date(goal.end_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
          <button onClick={handleMenuClick} className="p-1 hover:opacity-60 transition-opacity cursor-pointer" title="Options">
            <MoreVertical size={12} />
          </button>
          {menuOpen && menuPos && createPortal(
            <div
              ref={portalRef}
              className="fixed z-[9999] border-2 border-ink-black flex flex-col"
              style={{
                boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                backgroundColor: menuBg,
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
                  style={{ backgroundColor: menuBg }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = color.bg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = menuBg)}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <span className="font-mono text-[10px] font-bold leading-none text-ink-black">{item.badge}</span>}
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

function GoalItemOverlay({ goal }: { goal: Goal }) {
  const color = getGoalColor(goal.id, goal.color);
  
  return (
    <div
      className="border-2 border-ink-black cursor-grabbing"
      style={{ 
        boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', 
        backgroundColor: color.bg, 
        color: color.fg,
        opacity: 0.9,
      }}
    >
      <div className="px-2.5 py-1.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[11px] truncate leading-tight">{goal.title}</p>
          {goal.end_date && (
            <p className="text-[8px] mt-0.5 opacity-60 font-bold">
              {new Date(goal.end_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <MoreVertical size={12} />
      </div>
    </div>
  );
}

export default function GoalsSidebar({ goals, tasks, selectedGoalIds = [], onToggleGoalFilter, onNewGoal, onCreateTaskForGoal, onEditGoal, onDeleteGoal, onArchiveGoal, onUnarchiveGoal, onViewArchives, onRefresh }: Props) {
  const [filterView, setFilterView] = useState<'all' | 'active' | 'archived'>('active');
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [archivedGoals, setArchivedGoals] = useState<Goal[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const active = goals.filter(g => g.status === 'active');
    const completed = goals.filter(g => g.status === 'completed');
    const archived = goals.filter(g => g.status === 'archived');
    
    setActiveGoals(active);
    setArchivedGoals([...completed, ...archived]);
  }, [goals]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const isActiveView = filterView === 'active' || filterView === 'all';
    const currentGoals = isActiveView ? activeGoals : archivedGoals;
    
    const oldIndex = currentGoals.findIndex(g => g.id === active.id);
    const newIndex = currentGoals.findIndex(g => g.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedGoals = arrayMove(currentGoals, oldIndex, newIndex);

    // Update local state immediately for smooth UX
    if (isActiveView) {
      setActiveGoals(reorderedGoals);
    } else {
      setArchivedGoals(reorderedGoals);
    }

    // Calculate new positions and update database
    const updates = reorderedGoals.map((goal, index) => ({
      id: goal.id,
      position: (index + 1) * 1000,
    }));

    try {
      // Update all positions in the database
      for (const update of updates) {
        await supabase
          .from('goals')
          .update({ position: update.position, updated_at: getEstDate().toISOString() })
          .eq('id', update.id);
      }
      
      // Refresh the goals list
      onRefresh();
    } catch (error) {
      console.error('Error updating goal positions:', error);
      // Revert on error
      onRefresh();
    }
  };

  const cardProps = { tasks, selectedGoalIds, onToggleGoalFilter, onCreateTaskForGoal, onEditGoal, onDeleteGoal, onArchiveGoal, onUnarchiveGoal, onViewArchives };

  const displayGoals = filterView === 'active' || filterView === 'all' ? activeGoals : archivedGoals;
  const activeGoal = activeId ? goals.find(g => g.id === activeId) : null;

  return (
    <div className="flex flex-col border-2 border-ink-black h-full bg-ink-red/75" style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>
      <div className="bg-ink-red text-paper px-4 py-3 border-b-2 border-ink-black flex items-center gap-2 shrink-0">
        <h3 className="font-display text-base uppercase font-bold">Catégories</h3>
        <span className="ml-auto font-mono text-sm font-bold text-paper tabular-nums">{goals.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 border-b-2 border-ink-black flex flex-col gap-1.5 min-h-0 scrollbar-hide" style={{ overflowX: 'visible', backgroundColor: 'var(--theme-surface)' }}>
        <div className="flex gap-1 mb-1">
          <button onClick={() => setFilterView('active')} className={`flex-1 h-[32px] px-1.5 py-0 pt-0.5 inline-flex items-center justify-center text-[11px] leading-none font-bold uppercase tracking-wider border-2 border-ink-black ${filterView === 'active' ? 'bg-ink-red text-paper' : 'bg-paper text-ink-black'}`} style={{ boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>En cours</button>
          <button onClick={() => setFilterView('archived')} className={`flex-1 h-[32px] px-1.5 py-0 pt-0.5 inline-flex items-center justify-center text-[11px] leading-none font-bold uppercase tracking-wider border-2 border-ink-black ${filterView === 'archived' ? 'bg-ink-red text-paper' : 'bg-paper text-ink-black'}`} style={{ boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)' }}>Archives</button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayGoals.map(g => g.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayGoals.map((g, index) => (
              <SortableGoalItem 
                key={g.id} 
                goal={g} 
                itemIndex={index} 
                isDragging={activeId === g.id}
                {...cardProps} 
              />
            ))}
          </SortableContext>
          
          <DragOverlay>
            {activeGoal ? <GoalItemOverlay goal={activeGoal} /> : null}
          </DragOverlay>
        </DndContext>

        {goals.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm opacity-70 tracking-wide text-center">Aucune catégorie</p>
          </div>
        )}
      </div>

      <div className="shrink-0 flex justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
        <button onClick={onNewGoal} className="mb-3.5 mt-3.5 px-8 retro-btn bg-ink-red text-paper text-sm font-bold">Nouvelle catégorie</button>
      </div>
    </div>
  );
}
