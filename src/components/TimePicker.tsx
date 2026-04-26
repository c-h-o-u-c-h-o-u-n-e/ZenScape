import Dropdown, { DropdownOption } from './Dropdown';

interface TimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TimePicker({ value, onChange, placeholder = '--:--' }: TimePickerProps) {
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0');
    return { value: h, label: String(i) };
  });

  const minutes = Array.from({ length: 12 }, (_, i) => {
    const m = String(i * 5).padStart(2, '0');
    return { value: m, label: m };
  });

  function handleHourChange(newHour: string) {
    const newMinute = minute || '00';
    onChange(`${newHour}:${newMinute}`);
  }

  function handleMinuteChange(newMinute: string) {
    const newHour = hour || '00';
    onChange(`${newHour}:${newMinute}`);
  }

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <Dropdown
          value={hour}
          onChange={handleHourChange}
          options={hours}
          placeholder="HH"
        />
      </div>
      <span className="font-bold text-ink-black">:</span>
      <div className="flex-1">
        <Dropdown
          value={minute}
          onChange={handleMinuteChange}
          options={minutes}
          placeholder="MM"
        />
      </div>
    </div>
  );
}
