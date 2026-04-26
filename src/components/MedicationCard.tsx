import { Task, Goal } from '../types';
import { getGoalColor } from '../lib/goalColors';
import { Plus } from 'lucide-react';

interface MedicationCardProps {
  medications: Task[];
  goals: Goal[];
  onCreateMedication: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function MedicationCard({
  medications,
  goals,
  onCreateMedication,
  onEditTask,
  onDeleteTask
}: MedicationCardProps) {
  return (
    <div className="bg-ink-blue rounded-lg border border-neutral-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Posologie</h3>
        <button
          onClick={onCreateMedication}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          title="Ajouter un médicament"
        >
          <Plus className="w-5 h-5 text-neutral-600" />
        </button>
      </div>

      {medications.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">Aucun médicament pour aujourd'hui</p>
      ) : (
        <div className="space-y-3">
          {medications.map(med => {
            const goal = goals.find(g => g.id === med.goal_id);
            const goalColor = getGoalColor(med.goal_id, goal?.color);

            return (
              <div key={med.id} className="flex items-start gap-3 pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
                <div
                  className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: goalColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-900 text-sm">{med.title}</p>
                      {med.start_time && (
                        <p className="text-xs text-neutral-500 mt-0.5">{med.start_time}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteTask(med.id)}
                      className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
