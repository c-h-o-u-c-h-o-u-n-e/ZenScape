import { useState, useEffect } from 'react';
import { Task, Goal, Medication, TaskStatus } from '../types';
import { supabase } from '../lib/supabase';
import { getEstDateString, getMsUntilNextEstMidnight } from '../lib/timezone';
import { useUserPreferences } from '../lib/userPreferences';
import { isMedicationDueOnDate } from '../lib/medicationSchedule';
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
  onChangeTaskStatus: (taskId: string, status: TaskStatus) => void;
}

export default function DailyView({
                                    tasks,
                                    goals,
                                    onEditTask,
                                    onDeleteTask,
                                    onArchiveTask,
                                    onChangeTaskStatus,
                                  }: DailyViewProps) {
  const [preferences] = useUserPreferences();
  const [todayDate, setTodayDate] = useState(getEstDateString());
  const [selectedDate, setSelectedDate] = useState(getEstDateString());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationStatuses, setMedicationStatuses] = useState<Record<string, 'taken' | 'missed' | null>>({});
  const [medicationModal, setMedicationModal] = useState<{ open: boolean; medication: Medication | null }>({
    open: false,
    medication: null,
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUser();
  }, [preferences.timezone]);

  useEffect(() => {
    const timezoneToday = getEstDateString();
    setTodayDate(timezoneToday);
    setSelectedDate(prev => (prev === todayDate ? timezoneToday : prev));

    let timeoutId: number;

    const scheduleMidnightRefresh = () => {
      timeoutId = window.setTimeout(() => {
        const nextToday = getEstDateString();
        setTodayDate(prevToday => {
          if (prevToday !== nextToday) {
            setSelectedDate(prevSelected => (prevSelected === prevToday ? nextToday : prevSelected));
          }
          return nextToday;
        });
        scheduleMidnightRefresh();
      }, getMsUntilNextEstMidnight());
    };

    scheduleMidnightRefresh();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preferences.timezone]);

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

    const dueOnly = data
        ? (data as Medication[]).filter(med => isMedicationDueOnDate(med, selectedDate))
        : [];

    const { data: intakeRows } = await supabase
        .from('medication_intakes')
        .select('medication_id, status')
        .eq('user_id', userId)
        .eq('intake_date', selectedDate);

    const statusMap = (intakeRows ?? []).reduce<Record<string, 'taken' | 'missed' | null>>((acc, row) => {
      acc[row.medication_id] = row.status as 'taken' | 'missed';
      return acc;
    }, {});
    setMedicationStatuses(statusMap);

    const intakeMedicationIds = [...new Set((intakeRows ?? []).map(row => row.medication_id))];
    const missingIds = intakeMedicationIds.filter(id => !dueOnly.some(med => med.id === id));

    let extraFromIntakes: Medication[] = [];
    if (missingIds.length > 0) {
      const { data: medsByIds } = await supabase
          .from('medications')
          .select('*')
          .in('id', missingIds)
          .order('time_of_day', { ascending: true });
      extraFromIntakes = (medsByIds as Medication[] | null) ?? [];
    }

    setMedications([...dueOnly, ...extraFromIntakes]);
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
      .map(task => {
        // In "Aujourd'hui", overdue tasks are carried forward visually.
        // They should keep that carry-forward behavior, but without a scheduled hour
        // so they appear in the unscheduled section.
        if (selectedDate === todayDate && task.start_date && task.start_date < todayDate) {
          return { ...task, start_time: null };
        }

        return task;
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

  async function handleMarkMedicationTaken(medicationId: string) {
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;
    if (userId) {
      await supabase
        .from('medication_intakes')
        .delete()
        .eq('user_id', userId)
        .eq('medication_id', medicationId)
        .eq('intake_date', selectedDate);

      await supabase.from('medication_intakes').insert({
        user_id: userId,
        medication_id: medicationId,
        status: 'taken',
        intake_date: selectedDate,
      });
    }

    setMedicationStatuses(prev => ({
      ...prev,
      [medicationId]: 'taken',
    }));
  }

  async function handleMarkMedicationMissed(medicationId: string) {
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;
    if (userId) {
      await supabase
        .from('medication_intakes')
        .delete()
        .eq('user_id', userId)
        .eq('medication_id', medicationId)
        .eq('intake_date', selectedDate);

      await supabase.from('medication_intakes').insert({
        user_id: userId,
        medication_id: medicationId,
        status: 'missed',
        intake_date: selectedDate,
      });
    }

    setMedicationStatuses(prev => ({
      ...prev,
      [medicationId]: 'missed',
    }));
  }

  async function handleClearMedicationTaken(medicationId: string) {
    if (userId) {
      await supabase
        .from('medication_intakes')
        .delete()
        .eq('user_id', userId)
        .eq('medication_id', medicationId)
        .eq('intake_date', selectedDate);
    }

    setMedicationStatuses(prev => ({
      ...prev,
      [medicationId]: null,
    }));
  }

  return (
      <div className="h-full min-h-0 overflow-hidden flex flex-col">
        <div className="space-y-6 flex flex-col flex-1 min-h-0">
          {/* Header with date navigation */}
          <div className="shrink-0 pr-1">
            <DailyViewHeader date={selectedDate} onDateChange={setSelectedDate} />
          </div>

          {/* Main layout: Planning + Completed + Medications */}
          <div
              className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 pb-1 pr-1"
              style={{ gridTemplateRows: 'minmax(0, 1fr)' }}
          >
            {/* Planning Card */}
            <div className="min-h-0">
              <PlanningCard
                  tasks={dayTasks}
                  goals={goals}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onArchiveTask={onArchiveTask}
                  onChangeTaskStatus={onChangeTaskStatus}
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
                  onChangeTaskStatus={onChangeTaskStatus}
              />
            </div>

            {/* Medications Card */}
            <div className="min-h-0">
              <MedicationsDailyCard
                  medications={medications}
                  medicationStatuses={medicationStatuses}
                  onCreateMedication={() => setMedicationModal({ open: true, medication: null })}
                  onEditMedication={med => setMedicationModal({ open: true, medication: med })}
                  onDeleteMedication={handleDeleteMedication}
                  onMarkTaken={handleMarkMedicationTaken}
                  onMarkMissed={handleMarkMedicationMissed}
                  onClearTaken={handleClearMedicationTaken}
              />
            </div>
          </div>
        </div>

        {/* Medication Modal */}
        {medicationModal.open && userId && (
            <MedicationModal
                medication={medicationModal.medication}
                userId={userId}
                defaultStartDate={medicationModal.medication ? undefined : selectedDate}
                onClose={() => setMedicationModal({ open: false, medication: null })}
                onSaved={fetchMedications}
            />
        )}
      </div>
  );
}