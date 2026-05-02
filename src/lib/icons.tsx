import { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar as faCalendarRegular,
  faClock as faClockRegular,
  faUser as faUserRegular,
  faEnvelope as faEnvelopeRegular,
} from '@fortawesome/free-regular-svg-icons';
import {
  faTableCellsLarge,
  faMagnifyingGlass,
  faXmark,
  faBoxArchive,
  faChevronDown,
  faEllipsisVertical,
  faChevronLeft,
  faChevronRight,
  faPlus,
  faCheck,
  faRightFromBracket,
  faPen,
  faTrashCan,
  faFolder,
  faFolderOpen,
  faListCheck,
  faList,
  faBarsProgress,
  faGripVertical,
  faPills,
  faTablets,
  faPumpMedical,
  faEyeDropper,
  faLungs,
  faSyringe,
  faBandage,
  faBottleDroplet,
} from '@fortawesome/free-solid-svg-icons';

type IconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  color?: string;
  strokeWidth?: number;
};

function createIcon(icon: Parameters<typeof FontAwesomeIcon>[0]['icon']) {
  return function Icon({ size, className, style, color }: IconProps) {
    return (
      <FontAwesomeIcon
        icon={icon}
        className={className}
        style={{ fontSize: size ? `${size}px` : undefined, ...style }}
        color={color}
      />
    );
  };
}

export const LayoutGrid = createIcon(faTableCellsLarge);
export const Calendar = createIcon(faCalendarRegular);
export const Clock = createIcon(faClockRegular);
export const Search = createIcon(faMagnifyingGlass);
export const X = createIcon(faXmark);
export const Archive = createIcon(faBoxArchive);
export const ChevronDown = createIcon(faChevronDown);
export const MoreVertical = createIcon(faEllipsisVertical);
export const ChevronLeft = createIcon(faChevronLeft);
export const ChevronRight = createIcon(faChevronRight);
export const Plus = createIcon(faPlus);
export const Check = createIcon(faCheck);
export const Mail = createIcon(faEnvelopeRegular);
export const User = createIcon(faUserRegular);
export const LogOut = createIcon(faRightFromBracket);
export const Pen = createIcon(faPen);
export const Trash = createIcon(faTrashCan);
export const FolderDown = createIcon(faFolder);
export const FolderUp = createIcon(faFolderOpen);
export const ListCheck = createIcon(faListCheck);
export const List = createIcon(faList);
export const Progress = createIcon(faBarsProgress);
export const Drag = createIcon(faGripVertical);
export const Capsule = createIcon(faPills);
export const Tablets = createIcon(faTablets);
export const Cream = createIcon(faPumpMedical);
export const Gel = createIcon(faPumpMedical);
export const Drops = createIcon(faEyeDropper);
export const Inhaler = createIcon(faLungs);
export const Injection = createIcon(faSyringe);
export const Patch = createIcon(faBandage);
export const Ointment = createIcon(faPumpMedical);
export const Syrup = createIcon(faBottleDroplet);
export const Suppository = createIcon(faPills);
export const OralSuspension = createIcon(faBottleDroplet);
