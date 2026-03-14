import { useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';

interface WeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workoutDays?: number[]; // day_number from programme (1-7)
}

export const WeekStrip = ({ selectedDate, onSelectDate, workoutDays = [] }: WeekStripProps) => {
  const days = useMemo(() => {
    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate]);

  const today = new Date();

  return (
    <div className="flex gap-1 px-4 mb-4 overflow-x-auto scrollbar-none">
      {days.map((day, i) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const hasWorkout = workoutDays.includes(i + 1);

        return (
          <button
            key={i}
            onClick={() => onSelectDate(day)}
            className={`flex-1 min-w-[42px] flex flex-col items-center py-2 rounded-xl transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isToday
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-secondary text-muted-foreground border border-transparent'
            }`}
          >
            <span className="font-mono text-[8px] uppercase tracking-wider">
              {format(day, 'EEE')}
            </span>
            <span className={`font-mono text-sm font-bold ${isSelected ? '' : ''}`}>
              {format(day, 'd')}
            </span>
            {hasWorkout && !isSelected && (
              <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
};
