import { useState } from 'react';
import CheckInTab from '@/components/lifestyle/CheckInTab';
import HabitsTab from '@/components/lifestyle/HabitsTab';
import BreathworkTab from '@/components/lifestyle/BreathworkTab';
import WeeklyReflectionTab from '@/components/lifestyle/WeeklyReflectionTab';

const TABS = ['CHECK-IN', 'HABITS', 'REFLECT', 'BREATHWORK'] as const;

const LifestylePage = () => {
  const [tab, setTab] = useState<typeof TABS[number]>('CHECK-IN');

  return (
    <div className="min-h-screen pb-[60px]" style={{ background: 'hsl(var(--bg))' }}>
      {/* Tab bar */}
      <div className="sticky top-0 z-30 flex" style={{ background: 'hsl(var(--bg))', borderBottom: '1px solid hsl(var(--border))' }}>
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

      {tab === 'CHECK-IN' && <CheckInTab />}
      {tab === 'HABITS' && <HabitsTab />}
      {tab === 'REFLECT' && <WeeklyReflectionTab />}
      {tab === 'BREATHWORK' && <BreathworkTab />}
    </div>
  );
};

export default LifestylePage;
