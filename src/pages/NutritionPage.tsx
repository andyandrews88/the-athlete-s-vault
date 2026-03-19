import { useState } from 'react';
import HandPortionsTab from '@/components/nutrition/HandPortionsTab';
import MacrosTab from '@/components/nutrition/MacrosTab';

const TABS = ['Hand Portions', 'Macro Tracking'] as const;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

const NutritionPage = () => {
  const [tab, setTab] = useState<typeof TABS[number]>('Hand Portions');
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dayName = DAY_NAMES[dateObj.getDay()].toUpperCase();
  const shortDate = `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`;
  const isToday = selectedDate === toDateStr(new Date());

  const goYesterday = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStr(d));
  };

  return (
    <div className="min-h-screen pb-[60px]" style={{ background: 'hsl(var(--bg))' }}>
      {/* Date Navigation */}
      <div className="px-4 pt-4 pb-2 text-center">
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18,
          letterSpacing: 2,
          color: 'hsl(var(--text))',
        }}>
          {dayName}
        </div>
        <div className="flex justify-between items-center mt-1">
          <button onClick={goYesterday} style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>
            ← Yesterday
          </button>
          <span style={{ fontSize: 8, color: 'hsl(var(--mid))' }}>{shortDate}</span>
          {!isToday ? (
            <button onClick={() => setSelectedDate(toDateStr(new Date()))} style={{ fontSize: 8, color: 'hsl(var(--primary))' }}>
              Today →
            </button>
          ) : (
            <span style={{ fontSize: 8, color: 'transparent' }}>Today →</span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="sticky top-0 z-30 flex"
        style={{ background: 'hsl(var(--bg))', borderBottom: '1px solid hsl(var(--border))' }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-xs font-semibold tracking-widest transition-colors"
            style={{
              color: tab === t ? 'hsl(var(--primary))' : 'hsl(var(--dim))',
              borderBottom: tab === t ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Hand Portions' && <HandPortionsTab selectedDate={selectedDate} />}
      {tab === 'Macro Tracking' && <MacrosTab selectedDate={selectedDate} />}
    </div>
  );
};

export default NutritionPage;
