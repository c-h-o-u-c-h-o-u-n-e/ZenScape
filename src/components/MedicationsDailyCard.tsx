import { Medication } from '../types';
import { Trash2 } from 'lucide-react';
import { getMedicationFormatColor, shouldUseDarkText } from '../lib/medicationColors';

interface MedicationsDailyCardProps {
  medications: Medication[];
  onCreateMedication: () => void;
  onEditMedication: (medication: Medication) => void;
  onDeleteMedication: (medicationId: string) => void;
}

export default function MedicationsDailyCard({
  medications,
  onCreateMedication,
  onEditMedication,
  onDeleteMedication,
}: MedicationsDailyCardProps) {
  // Sort medications by time_of_day
  const timeOrder = { morning: 0, afternoon: 1, evening: 2, bedtime: 3 };
  const sortedMedications = medications.sort((a, b) => {
    const orderA = timeOrder[a.time_of_day as keyof typeof timeOrder] ?? 999;
    const orderB = timeOrder[b.time_of_day as keyof typeof timeOrder] ?? 999;
    return orderA - orderB;
  });

  const timeLabels = {
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soir',
    bedtime: 'Coucher',
  };

  return (
    <div
      className="border-2 border-ink-black flex flex-col h-full"
      style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
    >
      {/* Header */}
      <div className="border-b-2 border-ink-black bg-ink-pink px-4 py-3 h-[50px] flex items-center gap-2 shrink-0">
        <span
          className="w-5 h-5 bg-ink-black shrink-0"
          style={{
            WebkitMask: 'url(/icons/capsule.svg) center / contain no-repeat',
            mask: 'url(/icons/capsule.svg) center / contain no-repeat',
          }}
          aria-hidden="true"
        />
        <h3 className="font-display text-base uppercase text-ink-black">Posologie</h3>
        <span className="ml-auto font-mono text-xs font-bold text-ink-black opacity-80 tabular-nums shrink-0">
          {sortedMedications.length}
        </span>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 flex flex-col gap-3 min-h-0 bg-ink-pink/60" style={{ scrollbarWidth: 'none' }}>
        {sortedMedications.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-ink-black opacity-70">
            <p className="font-display text-sm text-center">Aucun médicament à prendre</p>
          </div>
        ) : (
          sortedMedications.map(medication => {
            const bgColor = getMedicationFormatColor(medication.format);
            const isDarkText = shouldUseDarkText(bgColor);
            const textColor = isDarkText ? '#1a1a1a' : '#FFFFFF';
            const secondaryTextColor = isDarkText ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)';

            return (
              <div
                key={medication.id}
                className="border-2 border-ink-black p-3"
                style={{
                  boxShadow: '2px 2px 0 #1a1a1a',
                  backgroundColor: bgColor
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-sm" style={{ color: textColor }}>{medication.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: secondaryTextColor }}>
                      {medication.dosage}{medication.time_of_day !== 'any' ? ` • ${timeLabels[medication.time_of_day as keyof typeof timeLabels] || medication.time_of_day}` : ''}
                    </p>
                    {medication.take_with_food && (
                      <p className="text-xs font-bold mt-1" style={{ color: textColor }}>Prendre avec de la nourriture</p>
                    )}
                    {medication.notes && (
                      <p className="text-xs mt-1 italic" style={{ color: secondaryTextColor }}>{medication.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteMedication(medication.id)}
                    className="p-1.5 rounded transition-colors flex-shrink-0 hover:opacity-80"
                    style={{ color: textColor }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add button */}
      <div className="px-3 pb-3 pt-1 flex justify-end bg-ink-pink/60">
        <button
          onClick={onCreateMedication}
          className="retro-btn bg-ink-teal text-paper text-sm font-bold px-3 py-2"
          title="Nouveau médicament"
        >
          Nouvelle prescription
        </button>
      </div>
    </div>
  );
}
