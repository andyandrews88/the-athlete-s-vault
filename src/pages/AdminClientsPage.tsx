import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  tier: string | null;
  audit_tier: string | null;
  created_at: string | null;
}

interface ClientEnriched extends ClientRow {
  programmeName: string;
  compliance: number;
  sessionsWk: number;
  lastSessionDate: string | null;
  activeToday: boolean;
  inactive6d: boolean;
  highStress: boolean;
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const filters = ['All', 'Active', 'Has Programme', 'Inactive', 'Foundation', 'Intermediate', 'Performance', 'Elite'] as const;

const AdminClientsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientEnriched[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const getMonday = (d: Date) => {
    const dt = new Date(d); const day = dt.getDay();
    dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
    dt.setHours(0, 0, 0, 0); return dt;
  };
  const mondayStr = useMemo(() => getMonday(new Date()).toISOString().slice(0, 10), []);
  const thirtyAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  }, []);
  const sixAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, tier, audit_tier, created_at').eq('role', 'client').order('created_at', { ascending: false });
      if (!profiles || profiles.length === 0) { setClients([]); setLoading(false); return; }

      const userIds = profiles.map(p => p.id);

      // Fetch all sessions for these users (last 30 days)
      const { data: allSessions } = await supabase.from('training_sessions').select('id, user_id, date, completed').in('user_id', userIds).gte('date', thirtyAgo);

      // Fetch active programmes
      const { data: progs } = await supabase.from('training_programmes').select('user_id, name').in('user_id', userIds).eq('is_active', true);

      // Fetch latest checkins for stress
      const { data: checkins } = await supabase.from('daily_checkins').select('user_id, stress, date').in('user_id', userIds).order('date', { ascending: false });

      const sessMap = new Map<string, typeof allSessions>();
      (allSessions ?? []).forEach(s => {
        if (!sessMap.has(s.user_id)) sessMap.set(s.user_id, []);
        sessMap.get(s.user_id)!.push(s);
      });

      const progMap = new Map<string, string>();
      (progs ?? []).forEach(p => { if (!progMap.has(p.user_id)) progMap.set(p.user_id, p.name); });

      const stressMap = new Map<string, number>();
      (checkins ?? []).forEach(c => { if (!stressMap.has(c.user_id)) stressMap.set(c.user_id, c.stress); });

      const enriched: ClientEnriched[] = profiles.map(p => {
        const sess = sessMap.get(p.id) ?? [];
        const completed30 = sess.filter(s => s.completed).length;
        const total30 = sess.length;
        const compliance = total30 > 0 ? Math.round((completed30 / total30) * 100) : 0;

        const sessWk = sess.filter(s => s.date >= mondayStr && s.completed).length;

        const lastSess = sess.filter(s => s.completed).sort((a, b) => b.date.localeCompare(a.date))[0];
        const lastSessionDate = lastSess?.date ?? null;
        const activeToday = lastSessionDate === today;

        const inactive6d = !lastSessionDate || lastSessionDate < sixAgo;
        const highStress = (stressMap.get(p.id) ?? 0) >= 8;

        return {
          ...p,
          programmeName: progMap.get(p.id) ?? '',
          compliance,
          sessionsWk: sessWk,
          lastSessionDate,
          activeToday,
          inactive6d,
          highStress,
        };
      });

      setClients(enriched);
    } catch { setClients([]); }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = clients;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.full_name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q));
    }

    switch (activeFilter) {
      case 'Active': list = list.filter(c => !c.inactive6d); break;
      case 'Has Programme': list = list.filter(c => c.programmeName); break;
      case 'Inactive': list = list.filter(c => c.inactive6d); break;
      case 'Foundation': list = list.filter(c => c.audit_tier?.toLowerCase() === 'foundation'); break;
      case 'Intermediate': list = list.filter(c => c.audit_tier?.toLowerCase() === 'intermediate'); break;
      case 'Performance': list = list.filter(c => c.audit_tier?.toLowerCase() === 'performance'); break;
      case 'Elite': list = list.filter(c => c.audit_tier?.toLowerCase() === 'elite'); break;
    }

    return list;
  }, [clients, search, activeFilter]);

  const totalClients = clients.length;
  const avgCompliance = totalClients > 0 ? Math.round(clients.reduce((a, c) => a + c.compliance, 0) / totalClients) : 0;
  const activeWk = clients.filter(c => c.sessionsWk > 0).length;
  const avgStreak = 0; // Placeholder — streak calc requires more data

  const initials = (name: string) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  const compBadge = (pct: number) => {
    if (pct > 80) return { bg: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))' };
    if (pct >= 50) return { bg: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))' };
    return { bg: 'hsla(0,72%,51%,0.1)', color: 'hsl(var(--bad))' };
  };

  const createTestClient = async () => {
    try {
      const id = crypto.randomUUID();
      await supabase.from('profiles').insert({
        id, email: 'testclient@vault.com', full_name: 'James D',
        role: 'client', tier: 'basic', audit_score: 72, audit_tier: 'PERFORMANCE', onboarding_complete: true,
      });
      await supabase.from('daily_checkins').insert({
        user_id: id, date: today, sleep: 7, energy: 8, stress: 3, mood: 8, soreness: 4,
      });
      toast({ title: 'Test client created' });
      loadAll();
    } catch { toast({ title: 'Failed to create test client', variant: 'destructive' }); }
  };

  const statCards = [
    { label: 'CLIENTS', value: totalClients },
    { label: 'COMPLIANCE', value: `${avgCompliance}%` },
    { label: 'ACTIVE', value: activeWk },
    { label: 'AVG STREAK', value: `${avgStreak}d` },
  ];

  return (
    <div style={{ background: 'hsl(var(--bg))', minHeight: '100vh', padding: 16, paddingBottom: 80 }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={20} style={{ color: 'hsl(var(--dim))' }} />
        </button>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: 'hsl(var(--text))', margin: 0, flex: 1 }}>CLIENTS</h1>
        <span style={{
          ...mono, fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.2)',
        }}>{totalClients}</span>
      </div>

      {/* SEARCH */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 8, padding: '8px 10px',
      }}>
        <Search size={14} style={{ color: 'hsl(var(--dim))', flexShrink: 0 }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'hsl(var(--text))', fontSize: 12,
          }}
        />
      </div>

      {/* FILTER PILLS */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {filters.map(f => {
          const active = activeFilter === f;
          return (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              ...mono, fontSize: 9, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
              background: active ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
              color: active ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
            }}>{f}</button>
          );
        })}
      </div>

      {/* STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{
            background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
            borderRadius: 8, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ ...mono, fontSize: 18, color: 'hsl(var(--primary))', lineHeight: 1 }}>{s.value}</div>
            <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CLIENT LIST */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[56px] rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 }}>
          <Users size={48} style={{ color: 'hsl(var(--dim))' }} />
          <div style={{ ...mono, fontSize: 14, color: 'hsl(var(--dim))' }}>No clients yet</div>
          <div style={{ ...mono, fontSize: 10, color: 'hsl(var(--dim))' }}>Share your referral link to get started</div>
          <button onClick={createTestClient} style={{
            ...mono, fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))',
          }}>＋ Add Test Client</button>
        </div>
      ) : (
        <div>
          {filtered.map(c => {
            const cb = compBadge(c.compliance);
            const name = c.full_name || c.email || 'Unknown';
            const lastActive = c.activeToday ? 'Active today' : c.lastSessionDate ? new Date(c.lastSessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No sessions';
            return (
              <div key={c.id} onClick={() => navigate(`/admin/client/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer',
                }}>
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...mono, fontSize: 11, fontWeight: 700, color: 'hsl(var(--primary))',
                }}>{initials(name)}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.programmeName ? `${c.programmeName} · ` : ''}{lastActive}
                  </div>
                </div>

                {/* Right */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <span style={{
                    ...mono, fontSize: 9, padding: '1px 6px', borderRadius: 3,
                    background: cb.bg, color: cb.color,
                  }}>{c.compliance}%</span>
                  <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>{c.sessionsWk}/wk</span>
                  {c.inactive6d && <span style={{ ...mono, fontSize: 8, color: 'hsl(var(--bad))' }}>inactive</span>}
                  {c.highStress && <span style={{ ...mono, fontSize: 8, color: 'hsl(var(--warn))' }}>High stress ⚠</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminClientsPage;
