import { useState, useEffect } from 'react';
import { Task, Goal, Medication } from '../types';
import { supabase } from '../lib/supabase';
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  const dayTasks = tasks
    .filter(task => task.start_date === selectedDate && !task.completed)
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
    .filter(task => task.start_date === selectedDate && task.status === 'done')
    .sort((a, b) => a.position - b.position);

  async function handleDeleteMedication(medicationId: string) {
    await supabase.from('medications').delete().eq('id', medicationId);
    fetchMedications();
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
      <div className="space-y-6 pb-4">
        {/* Header with date navigation */}
        <DailyViewHeader date={selectedDate} onDateChange={setSelectedDate} />

        {/* Main layout: Planning + Completed + Medications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Planning Card */}
          <div>
            <PlanningCard
              tasks={dayTasks}
              goals={goals}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onArchiveTask={onArchiveTask}
            />
          </div>

          {/* Completed Card */}
          <div>
            <CompletedCard
              tasks={completedDayTasks}
              goals={goals}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onArchiveTask={onArchiveTask}
            />
          </div>

          {/* Medications Card */}
          <div>
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
