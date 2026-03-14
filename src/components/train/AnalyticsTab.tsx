import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

type ViewMode = 'bar' | 'line' | 'radar' | 'table';

const ViewPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-vault-bg3 border border-vault-border text-vault-dim'
    }`}
  >
    {label}
  </button>
);

const ChartCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-5">
    <p className="font-mono text-[10px] text-vault-dim uppercase tracking-widest mb-4">{label}</p>
    {children}
  </div>
);

const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-4 text-center">
    <p className="font-mono text-[8px] text-vault-dim uppercase tracking-wider">{label}</p>
    <p className={`font-mono text-lg font-bold mt-1 ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
  </div>
);

const ComingSoon = ({ label }: { label: string }) => (
  <ChartCard label={label}>
    <p className="font-mono text-[10px] text-vault-dim text-center py-8">
      {label} — COMING SOON
    </p>
  </ChartCard>
);

export const AnalyticsTab = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [volumeData, setVolumeData] = useState<{ week: string; ntu: number }[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalNtu, setTotalNtu] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const weeks: { week: string; ntu: number }[] = [];
    let sessCount = 0;
    for (let i = 11; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('total_ntu')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('date', format(ws, 'yyyy-MM-dd'))
        .lte('date', format(we, 'yyyy-MM-dd'));

      const ntu = sessions?.reduce((sum, s) => sum + (Number(s.total_ntu) || 0), 0) ?? 0;
      weeks.push({ week: `W${12 - i}`, ntu: Math.round(ntu) });
      sessCount += sessions?.length ?? 0;
    }
    setVolumeData(weeks);
    setTotalSessions(sessCount);
    setTotalNtu(weeks.reduce((s, w) => s + w.ntu, 0));
  };

  const maxNtu = Math.max(...volumeData.map(d => d.ntu), 1);

  return (
    <div className="max-w-lg mx-auto px-4 space-y-4">
      {/* View toggle */}
      <div className="flex gap-2 mb-2">
        {(['bar', 'line', 'radar', 'table'] as ViewMode[]).map((mode) => (
          <ViewPill key={mode} label={mode} active={viewMode === mode} onClick={() => setViewMode(mode)} />
        ))}
      </div>

      {viewMode === 'bar' ? (
        <>
          {/* Weekly Volume Bar Chart */}
          <ChartCard label="WEEKLY VOLUME (NTU)">
            {volumeData.some(d => d.ntu > 0) ? (
              <div>
                <div className="flex items-end gap-1 h-16">
                  {volumeData.slice(-8).map((d, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const height = maxNtu > 0 ? (d.ntu / maxNtu) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm transition-all ${
                          isLast ? 'bg-primary shadow-[0_0_8px_hsl(192_91%_54%/0.4)]' : 'bg-primary/40'
                        }`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-1">
                  {volumeData.slice(-8).map((d, i) => (
                    <span key={i} className="flex-1 font-mono text-[7px] text-vault-dim text-center">{d.week}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-mono text-[10px] text-vault-dim text-center py-8">No data yet. Complete your first session.</p>
            )}
          </ChartCard>

          {/* Training Consistency */}
          <ChartCard label="TRAINING CONSISTENCY (12 WKS)">
            <div className="flex items-end gap-1 h-16">
              {volumeData.map((d, i, arr) => {
                const isLast = i === arr.length - 1;
                const height = d.ntu > 0 ? Math.max((d.ntu / maxNtu) * 100, 8) : 2;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all ${
                      isLast ? 'bg-primary shadow-[0_0_8px_hsl(192_91%_54%/0.4)]' : d.ntu > 0 ? 'bg-primary/40' : 'bg-vault-bg3'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </ChartCard>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="STRENGTH" value="—" />
            <StatCard label="VOLUME" value={`${totalNtu}`} accent />
            <StatCard label="COMPLIANCE" value={`${totalSessions}`} />
          </div>
        </>
      ) : (
        <ComingSoon label={`${viewMode.toUpperCase()} VIEW`} />
      )}
    </div>
  );
};
