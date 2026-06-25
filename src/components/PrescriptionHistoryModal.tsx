import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import {
  Capsule,
  Check,
  X,
  Tablets,
  Cream,
  Gel,
  Drops,
  Inhaler,
  Injection,
  Patch,
  Ointment,
  Syrup,
  Suppository,
  OralSuspension,
} from '../lib/icons';
import { supabase } from '../lib/supabase';
import { Medication, MedicationIntake } from '../types';
import ModalCloseButton from './ModalCloseButton';
import { getMedicationFormatColor, shouldUseDarkText } from '../lib/medicationColors';
import type { LucideIcon } from 'lucide-react';

interface Props {
  user: User;
  onClose: () => void;
}

type MedicationStats = {
  medication: Medication;
  daysInHistory: number;
  takenCount: number;
  missedCount: number;
  adherenceRate: number;
};

export default function PrescriptionHistoryModal({ user, onClose }: Props) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [intakes, setIntakes] = useState<MedicationIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);

      const [{ data: medsData }, { data: intakesData }] = await Promise.all([
        supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('medication_intakes')
          .select('*')
          .eq('user_id', user.id)
          .order('intake_date', { ascending: false }),
      ]);

      setMedications((medsData as Medication[] | null) ?? []);
      setIntakes((intakesData as MedicationIntake[] | null) ?? []);
      setLoading(false);
    }

    fetchHistory();
  }, [user.id]);

  async function handleResetStats() {
    setResetting(true);
    await supabase.from('medication_intakes').delete().eq('user_id', user.id);
    setIntakes([]);
    setResetting(false);
    setShowResetConfirm(false);
  }

  const statsByMedication = useMemo<MedicationStats[]>(() => {
    const intakesByMedication = intakes.reduce<Record<string, MedicationIntake[]>>((acc, intake) => {
      if (!acc[intake.medication_id]) acc[intake.medication_id] = [];
      acc[intake.medication_id].push(intake);
      return acc;
    }, {});

    return medications
      .map((medication) => {
        const rows = intakesByMedication[medication.id] ?? [];
        const takenCount = rows.filter(r => r.status === 'taken').length;
        const missedCount = rows.filter(r => r.status === 'missed').length;
        const total = takenCount + missedCount;
        const adherenceRate = total > 0 ? Math.round((takenCount / total) * 100) : 0;
        const uniqueDays = new Set(rows.map(r => r.intake_date));

        return {
          medication,
          daysInHistory: uniqueDays.size,
          takenCount,
          missedCount,
          adherenceRate,
        };
      })
      .sort((a, b) => {
        const activeA = isMedicationActive(a.medication);
        const activeB = isMedicationActive(b.medication);
        if (activeA !== activeB) return activeA ? -1 : 1;
        return a.medication.name.localeCompare(b.medication.name, 'fr', { sensitivity: 'base' });
      });
  }, [medications, intakes]);

  const selectedMedicationStats = useMemo(
    () => statsByMedication.find(s => s.medication.id === selectedMedicationId) ?? null,
    [selectedMedicationId, statsByMedication],
  );

  const globalStats = useMemo(() => {
    const taken = intakes.filter(i => i.status === 'taken').length;
    const missed = intakes.filter(i => i.status === 'missed').length;
    const total = taken + missed;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
    const activeDays = new Set(intakes.map(i => i.intake_date)).size;

    return {
      medicationCount: medications.length,
      total,
      taken,
      missed,
      adherenceRate,
      activeDays,
    };
  }, [medications, intakes]);

  const advancedStats = useMemo(() => {
    const avgEntriesPerActiveDay = globalStats.activeDays > 0
      ? (globalStats.total / globalStats.activeDays)
      : 0;

    const medicationsWithData = statsByMedication.filter(s => (s.takenCount + s.missedCount) > 0);
    const topByVolume = medicationsWithData[0] ?? null;

    const bestAdherence = medicationsWithData.length > 0
      ? [...medicationsWithData].sort((a, b) => b.adherenceRate - a.adherenceRate)[0]
      : null;

    const worstAdherence = medicationsWithData.length > 0
      ? [...medicationsWithData].sort((a, b) => a.adherenceRate - b.adherenceRate)[0]
      : null;

    const dayStatus = intakes.reduce<Record<string, { hasTaken: boolean; hasMissed: boolean }>>((acc, intake) => {
      if (!acc[intake.intake_date]) {
        acc[intake.intake_date] = { hasTaken: false, hasMissed: false };
      }

      if (intake.status === 'taken') acc[intake.intake_date].hasTaken = true;
      if (intake.status === 'missed') acc[intake.intake_date].hasMissed = true;
      return acc;
    }, {});

    const days = Object.keys(dayStatus).sort((a, b) => a.localeCompare(b));

    const isOneDayBefore = (previous: string, next: string) => {
      const prev = new Date(`${previous}T00:00:00`);
      const nx = new Date(`${next}T00:00:00`);
      const diff = (nx.getTime() - prev.getTime()) / 86400000;
      return diff === 1;
    };

    const isNoMissDay = (date: string) => dayStatus[date].hasTaken && !dayStatus[date].hasMissed;

    let longestNoMissStreak = 0;
    let runningStreak = 0;
    let previousDate: string | null = null;

    for (const date of days) {
      if (isNoMissDay(date)) {
        if (previousDate && isOneDayBefore(previousDate, date)) {
          runningStreak += 1;
        } else {
          runningStreak = 1;
        }
        longestNoMissStreak = Math.max(longestNoMissStreak, runningStreak);
      } else {
        runningStreak = 0;
      }

      previousDate = date;
    }

    let currentNoMissStreak = 0;
    if (days.length > 0) {
      let cursor = days[days.length - 1];
      if (isNoMissDay(cursor)) {
        currentNoMissStreak = 1;
        for (let i = days.length - 2; i >= 0; i -= 1) {
          const date = days[i];
          if (isNoMissDay(date) && isOneDayBefore(date, cursor)) {
            currentNoMissStreak += 1;
            cursor = date;
          } else {
            break;
          }
        }
      }
    }

    return {
      avgEntriesPerActiveDay,
      topByVolume,
      bestAdherence,
      worstAdherence,
      currentNoMissStreak,
      longestNoMissStreak,
    };
  }, [globalStats.activeDays, globalStats.total, intakes, statsByMedication]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/40" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-[640px] bg-paper transform transition-transform duration-300 ease-in-out z-50 flex flex-col scrollbar-hide"
        style={{
          transform: 'translateX(0)',
          borderLeft: '4px solid #1a1a1a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b-4 border-ink-black bg-ink-red text-paper shrink-0">
          <h2 className="font-display text-lg uppercase">Bilan médical</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="retro-btn bg-paper text-ink-red text-xs font-bold px-3 py-1.5"
              title="Réinitialiser toutes les statistiques"
            >
              Réinitialiser les stats
            </button>
            <ModalCloseButton onClose={onClose} className="text-paper p-1" />
          </div>
        </div>

        {showResetConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-black/50">
            <div
              className="border-2 border-ink-black bg-paper p-6 max-w-sm w-full mx-4"
              style={{ boxShadow: '6px 6px 0 rgba(26,26,26,0.6)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-base uppercase mb-2">Réinitialiser les stats ?</p>
              <p className="text-sm font-bold opacity-70 mb-5">
                Toutes les prises enregistrées seront supprimées définitivement. Les prescriptions resteront intactes.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="retro-btn bg-paper text-ink-black text-xs font-bold px-4 py-2"
                >
                  Annuler
                </button>
                <button
                  onClick={handleResetStats}
                  disabled={resetting}
                  className="retro-btn bg-ink-red text-paper text-xs font-bold px-4 py-2"
                >
                  {resetting ? 'Suppression...' : 'Réinitialiser'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="relative z-20 p-6 space-y-5 flex-1 overflow-y-auto scrollbar-hide"
          style={{ backgroundColor: 'var(--theme-surface)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            <p className="font-display text-base uppercase opacity-70">Chargement des statistiques...</p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-ink-black">
                <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                <p className="text-md uppercase font-bold whitespace-nowrap">Statistiques</p>
                <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
              </div>

              <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="Prescriptions" value={globalStats.medicationCount} icon={<Capsule size={14} />} />
                <StatCard label="Jours suivis" value={globalStats.activeDays} icon={<Capsule size={14} />} />
                <StatCard label="Prises totales" value={globalStats.taken} icon={<Check size={14} />} />
                <StatCard label="Oublis totaux" value={globalStats.missed} icon={<X size={14} />} />
                <StatCard label="Entrées totales" value={globalStats.total} icon={<Capsule size={14} />} />
                <StatCard label="Taux d'adhérence" value={`${globalStats.adherenceRate}%`} icon={<Check size={14} />} />
                <StatCard label="Moyenne / jour" value={advancedStats.avgEntriesPerActiveDay.toFixed(1)} icon={<Capsule size={14} />} />
                <StatCard label="Série actuelle jours sans oubli" value={advancedStats.currentNoMissStreak} icon={<Check size={14} />} />
                <StatCard label="Meilleure série jours sans oubli" value={advancedStats.longestNoMissStreak} icon={<Capsule size={14} />} />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InsightCard
                  label="Plus suivie"
                  value={advancedStats.topByVolume ? advancedStats.topByVolume.medication.name : '—'}
                  subValue={advancedStats.topByVolume ? `${advancedStats.topByVolume.takenCount + advancedStats.topByVolume.missedCount} entrées` : 'Aucune donnée'}
                />
                <InsightCard
                  label="Meilleure adhérence"
                  value={advancedStats.bestAdherence ? advancedStats.bestAdherence.medication.name : '—'}
                  subValue={advancedStats.bestAdherence ? `${advancedStats.bestAdherence.adherenceRate}%` : 'Aucune donnée'}
                />
                <InsightCard
                  label="Adhérence la plus faible"
                  value={advancedStats.worstAdherence ? advancedStats.worstAdherence.medication.name : '—'}
                  subValue={advancedStats.worstAdherence ? `${advancedStats.worstAdherence.adherenceRate}%` : 'Aucune donnée'}
                />
              </section>

              <section className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-ink-black">
                  <span className="w-4 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                  <p className="text-md uppercase font-bold whitespace-nowrap">Détail par médication</p>
                  <span className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-primary-text)' }} />
                </div>

                {statsByMedication.length === 0 ? (
                  <p className="text-sm font-bold opacity-70">Aucune donnée de prescription pour ce compte.</p>
                ) : (
                  <div className="space-y-3">
                    {statsByMedication.map((medicationStats) => {
                      const isExpanded = selectedMedicationId === medicationStats.medication.id;
                      return (
                        <button
                          key={medicationStats.medication.id}
                          type="button"
                          onClick={() =>
                            setSelectedMedicationId(prev =>
                              prev === medicationStats.medication.id ? null : medicationStats.medication.id,
                            )
                          }
                          className="w-full border-2 border-ink-black p-4 text-left transition-transform hover:-translate-y-[1px]"
                          style={{
                            backgroundColor: isExpanded
                              ? 'color-mix(in srgb, var(--theme-cta) 30%, var(--theme-background))'
                              : 'var(--theme-background)',
                            boxShadow: '4px 4px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)',
                          }}
                        >
                          <div className="grid grid-cols-[28px_1fr] gap-3 items-start mb-3">
                            <MedicationFormatIcon format={medicationStats.medication.format} size={24} />
                            <div>
                              <p className="font-mono font-bold text-sm">{medicationStats.medication.name}</p>
                              <p className="text-xs opacity-80">{buildDosageLine(medicationStats.medication)}</p>
                              {medicationStats.medication.take_with_food && (
                                <p className="text-xs font-bold mt-1">Prendre avec de la nourriture</p>
                              )}
                            </div>
                          </div>

                          <div
                            className="h-px w-full mb-3"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary-text) 45%, transparent)' }}
                          />

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-bold">
                            <span>Jours suivis: {medicationStats.daysInHistory}</span>
                            <span>Prises: {medicationStats.takenCount}</span>
                            <span>Manquées: {medicationStats.missedCount}</span>
                            <span>Adhérence: {medicationStats.adherenceRate}%</span>
                            <span>Début: {formatDate(medicationStats.medication.start_date)}</span>
                            <span>Fin: {medicationStats.medication.end_date ? formatDate(medicationStats.medication.end_date) : 'En cours'}</span>
                          </div>

                          {isExpanded && medicationStats.medication.notes && (
                            <>
                              <div
                                className="h-px w-full my-3"
                                style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary-text) 45%, transparent)' }}
                              />
                              <div className="mt-0">
                              <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Description</p>
                              <p className="text-xs font-bold">{medicationStats.medication.notes}</p>
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function getMedicationFormLabel(format: string, quantity: string): string {
  const normalized = format.toLowerCase();
  const trimmedQuantity = quantity.trim();
  const hasFraction = /\//.test(trimmedQuantity) || /[½⅓⅔¼¾⅛⅜⅝⅞]/.test(trimmedQuantity);
  const isPlural = !hasFraction && trimmedQuantity !== '1';

  const labels: Record<string, { singular: string; plural: string }> = {
    capsule: { singular: 'capsule', plural: 'capsules' },
    comprimé: { singular: 'comprimé', plural: 'comprimés' },
    crème: { singular: 'application de crème', plural: 'applications de crème' },
    gel: { singular: 'application de gel', plural: 'applications de gel' },
    gouttes: { singular: 'goutte', plural: 'gouttes' },
    inhalateur: { singular: 'bouffée', plural: 'bouffées' },
    injection: { singular: 'injection', plural: 'injections' },
    patch: { singular: 'patch', plural: 'patchs' },
    pommade: { singular: 'application de pommade', plural: 'applications de pommade' },
    sirop: { singular: 'dose de sirop', plural: 'doses de sirop' },
    suppositoire: { singular: 'suppositoire', plural: 'suppositoires' },
    'suspension orale': { singular: 'dose de suspension orale', plural: 'doses de suspension orale' },
  };

  const resolved = labels[normalized];
  if (resolved) return isPlural ? resolved.plural : resolved.singular;
  return isPlural ? `${normalized}s` : normalized;
}

function getTimePhrase(timeOfDay: string): string {
  const timePhrases: Record<string, string> = {
    morning: 'le matin',
    afternoon: "l'après-midi",
    evening: 'le soir',
    bedtime: 'au coucher',
  };
  return timePhrases[timeOfDay] || '';
}

function buildDosageLine(medication: Medication): string {
  const quantity = medication.recurrence_times?.trim();
  const dosage = medication.dosage?.trim();
  const timePhrase = medication.time_of_day !== 'any' ? getTimePhrase(medication.time_of_day) : '';
  const formLabel = quantity ? getMedicationFormLabel(medication.format, quantity) : medication.format.toLowerCase();
  const hasFraction = quantity ? /\//.test(quantity) || /[½⅓⅔¼¾⅛⅜⅝⅞]/.test(quantity) : false;
  const quantityPart = quantity ? `${quantity}${hasFraction ? ' de' : ''}` : undefined;

  const parts = [
    quantityPart,
    formLabel,
    dosage ? `de ${dosage}` : undefined,
    timePhrase || undefined,
  ].filter(Boolean);

  return parts.join(' ');
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isMedicationActive(medication: Medication): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const hasStarted = medication.start_date <= today;
  const notEnded = !medication.end_date || medication.end_date >= today;
  return hasStarted && notEnded;
}

function getMedicationFormatIcon(format: string): LucideIcon {
  const normalized = format.toLowerCase();
  const iconMap: Record<string, LucideIcon> = {
    capsule: Capsule,
    comprimé: Tablets,
    crème: Cream,
    gel: Gel,
    gouttes: Drops,
    inhalateur: Inhaler,
    injection: Injection,
    patch: Patch,
    pommade: Ointment,
    sirop: Syrup,
    suppositoire: Suppository,
    'suspension orale': OralSuspension,
  };
  return iconMap[normalized] || Capsule;
}

function MedicationFormatIcon({ format, size = 20 }: { format: string; size?: number }) {
  const Icon = getMedicationFormatIcon(format);
  const bgColor = getMedicationFormatColor(format);
  const textColor = shouldUseDarkText(bgColor) ? '#1a1a1a' : '#ffffff';

  return (
    <span title={format} className="inline-flex items-center justify-center">
      <Icon size={size} style={{ color: textColor, filter: `drop-shadow(0 0 0 ${bgColor})` }} />
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div
      className="border-2 border-ink-black p-3"
      style={{ backgroundColor: 'var(--theme-background)', boxShadow: '3px 3px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)' }}
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="flex items-center gap-2 opacity-80 min-w-0">
          {icon}
          <span className="text-[10px] uppercase font-bold leading-tight">{label}</span>
        </div>
        <p className="font-display text-2xl leading-none text-right">{value}</p>
      </div>
    </div>
  );
}

function InsightCard({ label, value, subValue }: { label: string; value: string; subValue: string }) {
  return (
    <div
      className="border-2 border-ink-black p-3"
      style={{ backgroundColor: 'var(--theme-background)', boxShadow: '3px 3px 0 color-mix(in srgb, var(--theme-primary-text) 60%, transparent)' }}
    >
      <p className="text-[10px] uppercase font-bold opacity-70 mb-1">{label}</p>
      <p className="font-display text-sm uppercase leading-tight">{value}</p>
      <p className="text-xs font-bold opacity-80 mt-1">{subValue}</p>
    </div>
  );
}