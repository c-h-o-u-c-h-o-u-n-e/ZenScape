import { useState, useEffect } from 'react';
import { Task, Goal, Medication } from '../types';
import { supabase } from '../lib/supabase';
import { getEstDateString } from '../lib/timezone';
import DailyViewHeader from './DailyViewHeader';
import PlanningCard from './PlanningCard';
import CompletedCard from './CompletedCard';
import MedicationsDailyCard from './MedicationsDailyCard';
import MedicationModal from './MedicationModal';

interface DailyViewProps {
  tasks: Task[];
  goals: Goal[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string, archived: boolean) => void;
}

export default function DailyView({
  tasks,
  goals,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
}: DailyViewProps) {
  const todayDate = getEstDateString();
  const [selectedDate, setSelectedDate] = useState(getEstDateString());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationModal, setMedicationModal] = useState<{ open: boolean; medication: Medication | null }>({
    open: false,
    medication: null,
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchMedications();
  }, [selectedDate, userId]);

  async function fetchMedications() {
    if (!userId) return;
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', selectedDate)
      .or(`end_date.is.null,end_date.gte.${selectedDate}`)
      .order('time_of_day', { ascending: true });

    if (data) setMedications(data as Medication[]);
  }

  function toLocalDateKey(dateValue: string): string {
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dayTasks = tasks
    .filter(task => {
      if (task.archived) return false;
      if (task.status === 'done') return false;
      if (!task.start_date) return false;

      // Pending tasks from past days are carried forward to today's planning
      // view at midnight, without modifying their stored start_date.
      if (selectedDate === todayDate) {
        return task.start_date <= selectedDate;
      }

      // Once carried forward, they should no longer appear in previous days.
      if (selectedDate < todayDate) {
        return false;
      }

      // Future day: show only tasks explicitly planned for that day.
      return task.start_date === selectedDate;
    })
    .sort((a, b) => {
      if (a.start_time && !b.start_time) return -1;
      if (!a.start_time && b.start_time) return 1;
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return a.position - b.position;
    });

  const completedDayTasks = tasks
    .filter(task => {
      if (task.status !== 'done') return false;

      // A completed task should remain visible for the day it was completed,
      // even if it gets archived later.
      const completedDate = toLocalDateKey(task.updated_at);
      return completedDate === selectedDate;
    })
    .sort((a, b) => a.position - b.position);

  async function handleDeleteMedication(medicationId: string) {
    await supabase.from('medications').delete().eq('id', medicationId);
    fetchMedications();
  }

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="space-y-6 flex flex-col flex-1 min-h-0">
        {/* Header with date navigation */}
        <div className="shrink-0 pr-1">
          <DailyViewHeader date={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {/* Main layout: Planning + Completed + Medications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 pr-1 pb-1" style={{ gridTemplateRows: 'minmax(0, 1fr)' }}>
          {/* Planning Card */}
          <div className="min-h-0">
            <PlanningCard
              tasks={dayTasks}
              goals={goals}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onArchiveTask={onArchiveTask}
            />
          </div>

          {/* Completed Card */}
          <div className="min-h-0">
            <CompletedCard
              tasks={completedDayTasks}
              goals={goals}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onArchiveTask={onArchiveTask}
            />
          </div>

          {/* Medications Card */}
          <div className="min-h-0">
            <MedicationsDailyCard
              medications={medications}
              onCreateMedication={() => setMedicationModal({ open: true, medication: null })}
              onEditMedication={med => setMedicationModal({ open: true, medication: med })}
              onDeleteMedication={handleDeleteMedication}
            />
          </div>
        </div>
      </div>

      {/* Medication Modal */}
      {medicationModal.open && userId && (
        <MedicationModal
          medication={medicationModal.medication}
          userId={userId}
          onClose={() => setMedicationModal({ open: false, medication: null })}
          onSaved={fetchMedications}
        />
      )}
    </div>
  );
}
