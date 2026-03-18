import { useEffect, useState, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Dumbbell, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AttentionItem {
  userId: string;
  name: string;
  reason: string;
  badge: 'INACTIVE' | 'FLAGGED';
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

interface ReflectionItem {
  userId: string;
  name: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [workoutsWk, setWorkoutsWk] = useState<number | null>(null);
  const [compliancePct, setCompliancePct] = useState<number | null>(null);
  const [activeWk, setActiveWk] = useState<number | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [reflectionItems, setReflectionItems] = useState<ReflectionItem[]>([]);

  const now = useMemo(() => new Date(), []);

  const getMonday = (d: Date) => {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const monday = useMemo(() => getMonday(now), [now]);
  const mondayStr = monday.toISOString().slice(0, 10);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, [now]);
  const sixDaysAgo = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, [now]);

  const weekNumber = useMemo(() => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }, [now]);

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadAttention(), loadReflections()]);
    } catch {
      // silent
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      setTotalUsers(count ?? 0);
    } catch { setTotalUsers(null); }

    try {
      const { count } = await supabase.from('training_sessions').select('*', { count: 'exact', head: true }).eq('completed', true).gte('date', sevenDaysAgo);
      setWorkoutsWk(count ?? 0);
    } catch { setWorkoutsWk(null); }

    try {
      const { count: completed } = await supabase.from('training_sessions').select('*', { count: 'exact', head: true }).eq('completed', true).gte('date', sevenDaysAgo);
      const { count: total } = await supabase.from('training_sessions').select('*', { count: 'exact', head: true }).gte('date', sevenDaysAgo);
      if (total && total > 0) {
        setCompliancePct(Math.round(((completed ?? 0) / total) * 100));
      } else {
        setCompliancePct(0);
      }
    } catch { setCompliancePct(null); }

    try {
      const { data } = await supabase.from('training_sessions').select('user_id').gte('date', mondayStr);
      const unique = new Set((data ?? []).map(r => r.user_id));
      setActiveWk(unique.size);
    } catch { setActiveWk(null); }
  };

  const loadAttention = async () => {
    try {
      const { data: clients } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'client');
      if (!clients) return;

      const items: AttentionItem[] = [];

      for (const c of clients) {
        if (items.length >= 5) break;
        const name = c.full_name || c.email || 'Unknown';

        // Check inactive
        const { data: sessions } = await supabase.from('training_sessions').select('id').eq('user_id', c.id).gte('date', sixDaysAgo).limit(1);
        if (!sessions || sessions.length === 0) {
          items.push({
            userId: c.id, name, reason: 'No session in 6 days',
            badge: 'INACTIVE',
            badgeColor: 'hsl(var(--bad))', badgeBg: 'hsla(0,72%,51%,0.1)', badgeBorder: 'hsla(0,72%,51%,0.3)',
          });
          continue;
        }

        // Check stress
        const { data: checkins } = await supabase.from('daily_checkins').select('stress').eq('user_id', c.id).order('date', { ascending: false }).limit(1);
        if (checkins && checkins.length > 0 && checkins[0].stress >= 8) {
          items.push({
            userId: c.id, name, reason: 'High stress reported',
            badge: 'FLAGGED',
            badgeColor: 'hsl(var(--warn))', badgeBg: 'hsla(38,92%,50%,0.1)', badgeBorder: 'hsla(38,92%,50%,0.3)',
          });
        }
      }

      setAttentionItems(items);
    } catch { setAttentionItems([]); }
  };

  const loadReflections = async () => {
    try {
      const { data } = await supabase.from('weekly_reflections').select('user_id').gte('created_at', mondayStr);
      if (!data || data.length === 0) { setReflectionItems([]); return; }

      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);

      setReflectionItems((profiles ?? []).map(p => ({
        userId: p.id,
        name: p.full_name || p.email || 'Unknown',
      })));
    } catch { setReflectionItems([]); }
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const stats = [
    { label: 'TOTAL USERS', value: totalUsers, icon: Users },
    { label: 'WORKOUTS/WK', value: workoutsWk, icon: Dumbbell },
    { label: 'COMPLIANCE %', value: compliancePct !== null ? `${compliancePct}%` : null, icon: Target },
    { label: 'ACTIVE THIS WK', value: activeWk, icon: TrendingUp },
  ];

  return (
    <AdminLayout>
    <div style={{ background: 'hsl(var(--bg))', minHeight: '100vh', padding: '16px', paddingBottom: 80 }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: 'hsl(var(--text))', margin: 0, letterSpacing: '0.04em' }}>
          ADMIN DASHBOARD
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'hsl(var(--dim))' }}>
            {dateStr} · Week {weekNumber}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, padding: '2px 8px', borderRadius: 4,
            background: 'hsla(38,92%,50%,0.15)', color: 'hsl(var(--warn))', border: '1px solid hsla(38,92%,50%,0.3)',
          }}>ADMIN</span>
        </div>
      </div>

      {/* STATS GRID */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[90px] rounded-[10px]" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
              borderRadius: 10, padding: 14,
            }}>
              <s.icon size={20} style={{ color: 'hsl(var(--primary))', marginBottom: 8 }} />
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, color: 'hsl(var(--primary))', lineHeight: 1 }}>
                {s.value !== null ? s.value : '—'}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'hsl(var(--dim))',
                textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* DEV: Add Test Client */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={async () => {
          try {
            const id = crypto.randomUUID();
            const today = new Date().toISOString().slice(0, 10);
            await supabase.from('profiles').insert({
              id, email: 'testclient@vault.com', full_name: 'James D',
              role: 'client', tier: 'basic', audit_score: 72, audit_tier: 'PERFORMANCE', onboarding_complete: true,
            });
            await supabase.from('daily_checkins').insert({
              user_id: id, date: today, sleep: 7, energy: 8, stress: 3, mood: 8, soreness: 4,
            });
            toast({ title: 'Test client created' });
            loadData();
          } catch { toast({ title: 'Failed to create test client', variant: 'destructive' }); }
        }} style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '4px 10px', borderRadius: 4,
          background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))', cursor: 'pointer',
        }}>＋ Add Test Client</button>
      </div>


      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <AlertTriangle size={12} style={{ color: 'hsl(var(--warn))' }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--warn))',
            letterSpacing: 2, textTransform: 'uppercase',
          }}>NEEDS ATTENTION</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <Skeleton key={i} className="h-[48px] rounded-lg" />)}
          </div>
        ) : attentionItems.length === 0 ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'hsl(var(--ok))' }}>
            All clients on track this week 🟢
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {attentionItems.map((item) => (
              <div key={item.userId} onClick={() => navigate(`/admin/client/${item.userId}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer',
                }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', background: 'hsl(var(--bg3))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'hsl(var(--dim))', flexShrink: 0,
                }}>{initials(item.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>{item.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--dim))' }}>{item.reason}</div>
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8, padding: '2px 6px', borderRadius: 3,
                  background: item.badgeBg, color: item.badgeColor, border: `1px solid ${item.badgeBorder}`,
                  flexShrink: 0,
                }}>{item.badge}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WEEKLY REFLECTIONS READY */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--primary))',
          letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
        }}>WEEKLY REFLECTIONS READY</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2].map(i => <Skeleton key={i} className="h-[44px] rounded-lg" />)}
          </div>
        ) : reflectionItems.length === 0 ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'hsl(var(--dim))' }}>
            No reflections submitted yet this week
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reflectionItems.map((item) => (
              <div key={item.userId} onClick={() => navigate(`/admin/client/${item.userId}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer',
                }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', background: 'hsl(var(--bg3))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'hsl(var(--dim))', flexShrink: 0,
                }}>{initials(item.name)}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>{item.name}</div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8, padding: '2px 6px', borderRadius: 3,
                  background: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.2)',
                  flexShrink: 0,
                }}>UNREAD</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM ACTIONS */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/admin/workout-builder')}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700, fontSize: 12,
          }}>+ Assign Programme</button>
        <button onClick={() => navigate('/admin/clients')}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--mid))', fontSize: 12,
          }}>View All Clients</button>
      </div>
    </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
