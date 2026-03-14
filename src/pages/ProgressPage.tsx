import { useState } from 'react';
import WeightTab from '@/components/progress/WeightTab';
import MeasurementsTab from '@/components/progress/MeasurementsTab';
import PhotosTab from '@/components/progress/PhotosTab';
import InBodyTab from '@/components/progress/InBodyTab';

const TABS = ['WEIGHT', 'MEASURE', 'PHOTOS', 'INBODY'] as const;

const ProgressPage = () => {
  const [tab, setTab] = useState<typeof TABS[number]>('WEIGHT');

  return (
    <div className="min-h-screen pb-[60px]" style={{ background: 'hsl(var(--bg))' }}>
      <div className="sticky top-0 z-30 flex" style={{ background: 'hsl(var(--bg))', borderBottom: '1px solid hsl(var(--border))' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-[10px] font-semibold tracking-widest transition-colors"
            style={{
              color: tab === t ? 'hsl(var(--primary))' : 'hsl(var(--dim))',
              borderBottom: tab === t ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'WEIGHT' && <WeightTab />}
      {tab === 'MEASURE' && <MeasurementsTab />}
      {tab === 'PHOTOS' && <PhotosTab />}
      {tab === 'INBODY' && <InBodyTab />}
    </div>
  );
};

export default ProgressPage;
