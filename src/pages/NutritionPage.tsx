import { useState } from 'react';
import HandPortionsTab from '@/components/nutrition/HandPortionsTab';
import MacrosTab from '@/components/nutrition/MacrosTab';

const TABS = ['Hand Portions', 'Macro Tracking'] as const;

const NutritionPage = () => {
  const [tab, setTab] = useState<typeof TABS[number]>('Hand Portions');

  return (
    <div className="min-h-screen pb-[60px]" style={{ background: 'hsl(var(--bg))' }}>
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

      {tab === 'Hand Portions' && <HandPortionsTab />}
      {tab === 'Macro Tracking' && <MacrosTab />}
    </div>
  );
};

export default NutritionPage;
