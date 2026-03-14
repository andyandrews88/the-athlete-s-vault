import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface DaySession {
  id: string;
  total_ntu: number | null;
  completed: boolean;
}

export const CalendarTab = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessionMap, setSessionMap] = useState<Record<string, DaySession[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDetail, setDayDetail] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadMonth();
  }, [user, currentMonth]);

  const loadMonth = async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('training_sessions')
      .select('id, date, total_ntu, completed')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end);

    const map: Record<string, DaySession[]> = {};
    data?.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    setSessionMap(map);
  };

  const handleDayClick = async (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const sessions = sessionMap[dateStr];
    if (!sessions?.length) {
      setDayDetail([]);
      return;
    }
    // Load exercises for the sessions
    const details: any[] = [];
    for (const s of sessions) {
      const { data: exs } = await supabase
        .from('session_exercises')
        .select('exercises(name), exercise_sets(reps, weight_kg, completed)')
        .eq('session_id', s.id) as any;
      details.push({ ...s, exercises: exs || [] });
    }
    setDayDetail(details);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startDay = getDay(startOfMonth(currentMonth));
  const blanks = (startDay === 0 ? 6 : startDay - 1); // Monday start

  return (
    <div className="mt-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-mono text-sm tracking-wider">{format(currentMonth, 'MMMM yyyy').toUpperCase()}</h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
          <div key={d} className="text-center font-mono text-[10px] text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: blanks }).map((_, i) => <div key={`b-${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const sessions = sessionMap[dateStr];
          const hasCompleted = sessions?.some(s => s.completed);
          const hasIncomplete = sessions?.some(s => !s.completed);

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors hover:bg-vault-bg3 ${
                isToday(day) ? 'border border-primary' : ''
              }`}
            >
              <span className={isToday(day) ? 'text-primary font-bold' : 'text-foreground'}>{format(day, 'd')}</span>
              {hasCompleted && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              {!hasCompleted && hasIncomplete && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full border border-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail bottom sheet */}
      <Sheet open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent side="bottom" className="bg-vault-bg2 border-t border-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm tracking-wider text-foreground">
              {selectedDate ? format(selectedDate, 'EEEE, dd MMM yyyy').toUpperCase() : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pb-6">
            {dayDetail.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono text-center py-8">No session logged</p>
            ) : (
              dayDetail.map((session: any, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-primary">{session.total_ntu ?? 0} NTU</span>
                    <span className={`text-xs font-mono ${session.completed ? 'text-vault-ok' : 'text-vault-warn'}`}>
                      {session.completed ? 'COMPLETED' : 'INCOMPLETE'}
                    </span>
                  </div>
                  {session.exercises?.map((ex: any, exIdx: number) => (
                    <div key={exIdx} className="text-sm text-muted-foreground">
                      {ex.exercises?.name} · {ex.exercise_sets?.filter((s: any) => s.completed).length || 0} sets
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
