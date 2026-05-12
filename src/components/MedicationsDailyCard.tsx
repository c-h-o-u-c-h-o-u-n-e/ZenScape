import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Medication } from '../types';
import {
  MoreVertical,
  Capsule,
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
  Pen,
  List,
  Check,
  Trash,
} from '../lib/icons';
import {
  getMedicationFormatColor,
  getMedicationMenuBgFromCardColor,
  shouldUseDarkText,
} from '../lib/medicationColors';

const EXPANDED_MEDICATIONS_STORAGE_KEY = 'zenscape.medications.expanded-details';

interface MedicationsDailyCardProps {
  medications: Medication[];
  medicationStatuses: Record<string, 'taken' | 'missed' | null>;
  onCreateMedication: () => void;
  onEditMedication: (medication: Medication) => void;
  onDeleteMedication: (medicationId: string) => void;
  onMarkTaken: (medicationId: string) => void;
  onMarkMissed: (medicationId: string) => void;
  onClearTaken: (medicationId: string) => void;
  hideCreateButton?: boolean;
  textOnly?: boolean;
}

export default function MedicationsDailyCard({
                                               medications,
                                               medicationStatuses,
                                               onCreateMedication,
                                               onEditMedication,
                                               onDeleteMedication,
                                               onMarkTaken,
                                               onMarkMissed,
                                               onClearTaken,
                                               hideCreateButton = false,
                                               textOnly = false,
                                             }: MedicationsDailyCardProps) {
  const [expandedMeds, setExpandedMeds] = useState<Set<string>>(new Set());
  const [expandedMedsLoaded, setExpandedMedsLoaded] = useState(false);
  const [menuOpenMedId, setMenuOpenMedId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_MEDICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const normalizedIds = parsed.filter((id): id is string => typeof id === 'string');
          setExpandedMeds(new Set(normalizedIds));
        }
      }
    } catch {
      // Ignore invalid persisted values.
    } finally {
      setExpandedMedsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!expandedMedsLoaded) return;
    try {
      localStorage.setItem(
        EXPANDED_MEDICATIONS_STORAGE_KEY,
        JSON.stringify(Array.from(expandedMeds)),
      );
    } catch {
      // Ignore storage write errors.
    }
  }, [expandedMeds, expandedMedsLoaded]);

  useEffect(() => {
    if (!menuOpenMedId) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inPortal = menuPortalRef.current?.contains(target);
      if (!inPortal) {
        setMenuOpenMedId(null);
        setMenuPosition(null);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenMedId]);

  const getMedicationFormatIcon = (format: string) => {
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
  };

  const getMedicationFormLabel = (format: string, quantity: string) => {
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
  };

  const getTimePhrase = (timeOfDay: string) => {
    const timePhrases: Record<string, string> = {
      morning: 'le matin',
      afternoon: "l'après-midi",
      evening: 'le soir',
      bedtime: 'au coucher',
    };

    return timePhrases[timeOfDay] || '';
  };

  const buildDosageLine = (medication: Medication) => {
    const quantity = medication.recurrence_times?.trim();
    const dosage = medication.dosage?.trim();
    const timePhrase = medication.time_of_day !== 'any' ? getTimePhrase(medication.time_of_day) : '';
    const formLabel = quantity ? getMedicationFormLabel(medication.format, quantity) : medication.format.toLowerCase();
    const hasFraction = quantity ? /\//.test(quantity) || /[½⅓⅔¼¾⅛⅜⅝⅞]/.test(quantity) : false;
    const quantityPart = quantity ? `${quantity}${hasFraction ? ' de' : ''}` : undefined;

    if (quantity || dosage || timePhrase) {
      const parts = [
        quantityPart,
        formLabel,
        dosage ? `de ${dosage}` : undefined,
        timePhrase || undefined,
      ].filter(Boolean);

      return parts.join(' ');
    }

    return '';
  };

  const toggleExpanded = (medId: string) => {
    const newSet = new Set(expandedMeds);
    if (newSet.has(medId)) newSet.delete(medId);
    else newSet.add(medId);
    setExpandedMeds(newSet);
  };

  const timeOrder = { morning: 0, afternoon: 1, evening: 2, bedtime: 3 };
  const sortedMedications = [...medications].sort((a, b) => {
    const orderA = timeOrder[a.time_of_day as keyof typeof timeOrder] ?? 999;
    const orderB = timeOrder[b.time_of_day as keyof typeof timeOrder] ?? 999;
    return orderA - orderB;
  });

  const menuMedication = sortedMedications.find(m => m.id === menuOpenMedId) ?? null;
  const menuMedicationStatus = menuMedication ? (medicationStatuses[menuMedication.id] ?? null) : null;
  const menuBg = menuMedication
    ? getMedicationMenuBgFromCardColor(getMedicationFormatColor(menuMedication.format))
    : '#f4e8d1';

  // =========================
  // VERSION TEXT ONLY
  // =========================
  if (textOnly) {
    return (
        <div
            className="border-2 border-ink-black flex flex-col h-full"
            style={{ boxShadow: '8px 5px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', backgroundColor: 'var(--theme-background)' }}
        >
          <div className="border-b-2 border-ink-black bg-ink-red px-4 py-3 h-[50px] flex items-center gap-2 shrink-0">
            <Capsule size={16} className="text-paper" />
            <h4 className="font-display text-base uppercase text-paper">Prescriptions</h4>
            <span className="ml-auto font-mono text-sm font-bold text-paper tabular-nums shrink-0">
            {sortedMedications.length}
          </span>
          </div>

          <div
              className="px-4 pt-2.5 pb-2 space-y-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide text-ink-black"
              style={{ scrollbarWidth: 'none', backgroundColor: 'var(--theme-background)' }}
          >
            {sortedMedications.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-ink-black opacity-70">
                  <p className="font-display text-sm text-center">Aucun médicament à prendre</p>
                </div>
            ) : (
                sortedMedications.map((medication) => {
                  const Icon = getMedicationFormatIcon(medication.format);
                  const isTaken = medicationStatuses[medication.id] === 'taken';
                  const isMissed = medicationStatuses[medication.id] === 'missed';

                  return (
                      <div key={medication.id} className="py-0 text-ink-black">
                        <button
                            type="button"
                            onClick={() => onEditMedication(medication)}
                            className="w-full text-left pr-1"
                        >
                          <div className="flex items-start mt-0.5 gap-2">
                            <Icon size={16} className="shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-display text-sm ml-1 leading-tight whitespace-normal break-words font-bold">
                                {medication.name}
                              </p>
                              <p className="font-display text-sm ml-1 leading-tight whitespace-normal break-words opacity-80">
                                {buildDosageLine(medication)}
                              </p>
                              {medication.take_with_food && (
                                  <p className="font-display text-sm ml-1 leading-tight whitespace-normal break-words opacity-80">
                                    Prendre avec de la nourriture
                                  </p>
                              )}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkTaken(medication.id);
                                }}
                                className="shrink-0 self-start px-3 py-2 border-2 border-ink-black text-xs font-bold uppercase inline-flex items-center"
                                style={{
                                  backgroundColor: 'var(--theme-cta)',
                                  color: 'var(--theme-background)',
                                  boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                                }}
                                title="Enregistrer la prise"
                            >
                              {isMissed ? 'Manqué' : isTaken ? 'Pris' : 'Enregistrer la prise'}
                            </button>
                          </div>
                        </button>
                      </div>
                  );
                })
            )}
          </div>

          {!hideCreateButton && (
              <div className="px-3 pb-3 pt-1 flex justify-end shrink-0" style={{ backgroundColor: 'var(--theme-background)' }}>
                <button
                    onClick={onCreateMedication}
                    className="retro-btn bg-ink-red text-paper text-sm px-3 py-2 leading-none"
                    title="Nouveau médicament"
                >
                  Nouvelle prescription
                </button>
              </div>
          )}
        </div>
    );
  }

  // =========================
  // VERSION NORMALE (Aujourd'hui)
  // =========================
  return (
      <div
          className="border-2 border-ink-black flex flex-col h-full"
          style={{ boxShadow: '8px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', backgroundColor: '#f4e8d1' }}
      >
        <div className="border-b-2 border-ink-black bg-ink-red px-4 py-3 h-[50px] flex items-center gap-2 shrink-0">
          <Capsule size={16} className="text-paper" />
          <h3 className="font-display text-base uppercase text-paper">Prescriptions</h3>
          <span className="ml-auto font-mono text-sm font-bold text-paper tabular-nums shrink-0">
          {sortedMedications.length}
        </span>
        </div>

        <div
            className="px-4 py-3 space-y-1 flex-1 min-h-0 overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', backgroundColor: 'var(--theme-surface)' }}
        >
          {sortedMedications.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-ink-black opacity-70">
                <p className="font-display text-sm text-center">Aucun médicament à prendre</p>
              </div>
          ) : (
              sortedMedications.map((medication) => {
                const bgColor = getMedicationFormatColor(medication.format);
                const isDarkText = shouldUseDarkText(bgColor);
                const textColor = isDarkText ? '#1a1a1a' : '#FFFFFF';
                const secondaryTextColor = isDarkText ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)';
                const isExpanded = expandedMeds.has(medication.id);
                const medicationStatus = medicationStatuses[medication.id] ?? null;
                const isMissed = medicationStatus === 'missed';

                return (
                    <div key={medication.id} className="py-1">
                      <div
                          className="border-2 border-ink-black overflow-hidden"
                          style={{ boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)', backgroundColor: bgColor }}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {(() => {
                                const Icon = getMedicationFormatIcon(medication.format);
                                return (
                                    <Icon
                                        size={20}
                                        style={{ color: textColor }}
                                        className="shrink-0 mt-0.5"
                                    />
                                );
                              })()}
                              <div className="min-w-0 flex-1">
                                <p
                                    className="font-mono font-bold text-sm"
                                    style={{ color: textColor }}
                                >
                                  {medication.name}
                                </p>
                                <p
                                    className="text-xs mt-0.5"
                                    style={{ color: secondaryTextColor }}
                                >
                                  {buildDosageLine(medication)}
                                </p>
                                {medication.take_with_food && (
                                    <p
                                        className="text-xs font-bold mt-1"
                                        style={{ color: secondaryTextColor }}
                                    >
                                      Prendre avec de la nourriture
                                    </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                  onClick={() => onMarkTaken(medication.id)}
                                  className="shrink-0 self-start px-3 py-2 border-2 border-ink-black text-xs font-bold uppercase inline-flex items-center"
                                  style={{
                                    backgroundColor: 'var(--theme-cta)',
                                    color: 'var(--theme-background)',
                                    boxShadow: '2px 2px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                                  }}
                                  title="Enregistrer la prise"
                              >
                                {isMissed ? 'Manqué' : medicationStatus === 'taken' ? 'Pris' : 'Enregistrer la prise'}
                              </button>
                            </div>

                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (menuOpenMedId === medication.id) {
                                      setMenuOpenMedId(null);
                                      setMenuPosition(null);
                                      return;
                                    }
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    const estimatedMenuHeight = 84;
                                    const spaceBelowViewport = window.innerHeight - rect.bottom;
                                    const openUp = spaceBelowViewport < estimatedMenuHeight;
                                    setMenuPosition({
                                      top: openUp ? undefined : rect.bottom + 6,
                                      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
                                      right: window.innerWidth - rect.right,
                                    });
                                    setMenuOpenMedId(medication.id);
                                  }}
                                  className="p-1.5 rounded transition-colors hover:opacity-80"
                                  style={{ color: textColor }}
                                  title="Menu"
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {medication.notes && isExpanded && (
                            <>
                              <div style={{ height: '2px', backgroundColor: '#1a1a1a' }} />
                              <div
                                  className="p-3 overflow-hidden"
                                  style={{
                                    animation: 'fadeIn 0.25s ease-in-out',
                                    backgroundColor: bgColor,
                                    opacity: 0.8,
                                  }}
                              >
                                <p
                                    className="font-mono font-bold text-xs"
                                    style={{ color: textColor }}
                                >
                                  {medication.notes}
                                </p>
                              </div>
                            </>
                        )}

                        <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; }
                      to { opacity: 0.6; }
                    }
                  `}</style>
                      </div>
                    </div>
                );
              })
          )}
        </div>

        {!hideCreateButton && (
            <div
                className="px-3 pb-3 pt-1 flex justify-end"
                style={{ backgroundColor: 'var(--theme-surface)' }}
            >
              <button
                  onClick={onCreateMedication}
                  className="retro-btn bg-ink-red text-paper text-sm h-10 px-3 py-2 leading-none"
                  title="Nouveau médicament"
              >
                Nouvelle prescription
              </button>
            </div>
        )}

        {menuOpenMedId &&
            menuMedication &&
            menuPosition &&
            createPortal(
                <div
                    ref={menuPortalRef}
                    className="fixed min-w-[220px] border-2 border-ink-black z-[9999]"
                    style={{
                      boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
                      color: '#1a1a1a',
                      backgroundColor: menuBg,
                      top: menuPosition.top !== undefined ? `${menuPosition.top}px` : 'auto',
                      bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : 'auto',
                      right: `${menuPosition.right}px`,
                    }}
                >
                  <button
                      onClick={() => {
                        if (!menuMedication) return;
                        if (menuMedicationStatus === 'taken') {
                          onClearTaken(menuMedication.id);
                        } else {
                          onMarkTaken(menuMedication.id);
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2"
                      style={{ backgroundColor: menuBg }}
                      onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = getMedicationFormatColor(
                              menuMedication.format,
                          ))
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
                  >
                    <Check size={14} /> {menuMedicationStatus === 'taken' ? 'Annuler la prise' : 'Enregistrer la prise'}
                  </button>
                  <button
                      onClick={() => {
                        if (menuMedicationStatus === 'missed') {
                          onClearTaken(menuMedication.id);
                        } else {
                          onMarkMissed(menuMedication.id);
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2"
                      style={{ backgroundColor: menuBg }}
                      onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = getMedicationFormatColor(
                              menuMedication.format,
                          ))
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
                  >
                    <Trash size={14} /> {menuMedicationStatus === 'missed' ? "Annuler l'oubli" : 'Prise manquée'}
                  </button>
                  {menuMedication.notes && (
                      <button
                          onClick={() => toggleExpanded(menuMedication.id)}
                          className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2 whitespace-nowrap"
                          style={{ backgroundColor: menuBg }}
                          onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor = getMedicationFormatColor(
                                  menuMedication.format,
                              ))
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
                      >
                        <List size={14} />
                        <span className="flex-1">Afficher les détails</span>
                        {expandedMeds.has(menuMedication.id) && <Check size={14} />}
                      </button>
                  )}
                  <button
                      onClick={() => {
                        setMenuOpenMedId(null);
                        setMenuPosition(null);
                        onEditMedication(menuMedication);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold border-b border-ink-black transition-colors flex items-center gap-2"
                      style={{ backgroundColor: menuBg }}
                      onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = getMedicationFormatColor(
                              menuMedication.format,
                          ))
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
                  >
                    <Pen size={14} /> Modifier
                  </button>
                  <button
                      onClick={() => {
                        setMenuOpenMedId(null);
                        setMenuPosition(null);
                        onDeleteMedication(menuMedication.id);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2"
                      style={{ backgroundColor: menuBg }}
                      onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = getMedicationFormatColor(
                              menuMedication.format,
                          ))
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = menuBg)}
                  >
                    <Trash size={14} /> Supprimer
                  </button>
                </div>,
                document.body,
            )}
      </div>
  );
}