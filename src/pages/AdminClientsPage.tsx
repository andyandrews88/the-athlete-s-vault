import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, X, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  tier: string | null;
  audit_tier: string | null;
  created_at: string | null;
  status: string | null;
  internal_notes: string | null;
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

const filters = ['All', 'Active', 'Inactive', 'Suspended', 'Free', 'Premium', 'Coaching', 'Has Programme'] as const;
const TIERS = ['free', 'premium', 'coaching'] as const;
const STATUSES = ['active', 'inactive', 'suspended'] as const;

const AdminClientsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientEnriched[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientEnriched | null>(null);
  const [removeClient, setRemoveClient] = useState<ClientEnriched | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAutoPassword, setFormAutoPassword] = useState(true);
  const [formTier, setFormTier] = useState<string>('free');
  const [formStatus, setFormStatus] = useState<string>('active');
  const [formNotes, setFormNotes] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  // Inline dropdowns
  const [tierDropdown, setTierDropdown] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

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
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, tier, audit_tier, created_at, status, internal_notes').eq('role', 'client').order('created_at', { ascending: false });
      if (!profiles || profiles.length === 0) { setClients([]); setLoading(false); return; }

      const userIds = profiles.map(p => p.id);
      const { data: allSessions } = await supabase.from('training_sessions').select('id, user_id, date, completed').in('user_id', userIds).gte('date', thirtyAgo);
      const { data: progs } = await supabase.from('training_programmes').select('user_id, name').in('user_id', userIds).eq('is_active', true);
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
        return { ...p, programmeName: progMap.get(p.id) ?? '', compliance, sessionsWk: sessWk, lastSessionDate, activeToday, inactive6d, highStress };
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
      case 'Active': list = list.filter(c => (c.status ?? 'active') === 'active'); break;
      case 'Inactive': list = list.filter(c => (c.status ?? 'active') === 'inactive'); break;
      case 'Suspended': list = list.filter(c => (c.status ?? 'active') === 'suspended'); break;
      case 'Free': list = list.filter(c => (c.tier ?? 'free') === 'free'); break;
      case 'Premium': list = list.filter(c => (c.tier ?? 'free') === 'premium'); break;
      case 'Coaching': list = list.filter(c => (c.tier ?? 'free') === 'coaching'); break;
      case 'Has Programme': list = list.filter(c => c.programmeName); break;
    }
    return list;
  }, [clients, search, activeFilter]);

  const totalClients = clients.length;
  const avgCompliance = totalClients > 0 ? Math.round(clients.reduce((a, c) => a + c.compliance, 0) / totalClients) : 0;
  const activeWk = clients.filter(c => c.sessionsWk > 0).length;

  const initials = (name: string) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  const compBadge = (pct: number) => {
    if (pct > 80) return { bg: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))' };
    if (pct >= 50) return { bg: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))' };
    return { bg: 'hsla(0,72%,51%,0.1)', color: 'hsl(var(--bad))' };
  };

  const statusDot = (s: string | null) => {
    const st = s ?? 'active';
    if (st === 'active') return 'hsl(var(--ok))';
    if (st === 'inactive') return 'hsl(var(--warn))';
    return 'hsl(var(--bad))';
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const openAddModal = () => {
    setFormName(''); setFormEmail(''); setFormPassword(generatePassword());
    setFormAutoPassword(true); setFormTier('free'); setFormStatus('active'); setFormNotes('');
    setCreatedCreds(null); setShowAddModal(true); setEditingClient(null);
  };

  const openEditModal = (c: ClientEnriched) => {
    setEditingClient(c); setShowAddModal(false); setCreatedCreds(null);
    setFormName(c.full_name ?? ''); setFormEmail(c.email ?? '');
    setFormTier(c.tier ?? 'free'); setFormStatus(c.status ?? 'active');
    setFormNotes(c.internal_notes ?? '');
  };

  const handleCreateClient = async () => {
    if (!formName.trim() || !formEmail.trim()) { toast({ title: 'Name and email required', variant: 'destructive' }); return; }
    setFormSaving(true);
    const password = formAutoPassword ? formPassword : formPassword;
    if (!password || password.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); setFormSaving(false); return; }

    try {
      // Use edge function or direct insert for profile (auth.admin not available client-side)
      // Instead, sign up normally and update profile
      const { data, error } = await supabase.auth.signUp({ email: formEmail.trim(), password, options: { data: { full_name: formName.trim() } } });
      if (error) throw error;
      if (data.user) {
        const refCode = `${formName.split(' ')[0].toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('profiles').upsert({
          id: data.user.id, email: formEmail.trim(), full_name: formName.trim(),
          role: 'client', tier: formTier, status: formStatus,
          internal_notes: formNotes || null, created_by: user?.id,
          referral_code: refCode, onboarding_complete: false,
        });
      }
      setCreatedCreds({ email: formEmail.trim(), password });
      toast({ title: 'Client created' });
      loadAll();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to create client', variant: 'destructive' });
    }
    setFormSaving(false);
  };

  const handleEditSave = async () => {
    if (!editingClient) return;
    setFormSaving(true);
    try {
      await supabase.from('profiles').update({
        full_name: formName.trim() || null,
        tier: formTier,
        status: formStatus,
        internal_notes: formNotes || null,
      }).eq('id', editingClient.id);
      toast({ title: 'Client updated' });
      setEditingClient(null);
      loadAll();
    } catch { toast({ title: 'Failed to update', variant: 'destructive' }); }
    setFormSaving(false);
  };

  const handleRemoveClient = async () => {
    if (!removeClient) return;
    await supabase.from('profiles').update({ status: 'removed', role: 'removed' }).eq('id', removeClient.id);
    toast({ title: `${removeClient.full_name || 'Client'} removed` });
    setRemoveClient(null);
    loadAll();
  };

  const inlineTierChange = async (clientId: string, tier: string) => {
    await supabase.from('profiles').update({ tier }).eq('id', clientId);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, tier } : c));
    setTierDropdown(null);
    toast({ title: 'Updated ✓' });
  };

  const inlineStatusChange = async (clientId: string, status: string) => {
    await supabase.from('profiles').update({ status }).eq('id', clientId);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status } : c));
    setStatusDropdown(null);
    toast({ title: 'Updated ✓' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  const statCards = [
    { label: 'CLIENTS', value: totalClients },
    { label: 'COMPLIANCE', value: `${avgCompliance}%` },
    { label: 'ACTIVE', value: activeWk },
  ];

  const tierLabel = (t: string | null) => (t ?? 'free').charAt(0).toUpperCase() + (t ?? 'free').slice(1);
  const tierColor = (t: string | null) => {
    if (t === 'coaching') return { bg: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))' };
    if (t === 'premium') return { bg: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))' };
    return { bg: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' };
  };

  // Modal overlay style
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 60, background: 'hsla(0,0%,0%,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };
  const modal: React.CSSProperties = {
    background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))',
    borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8, background: 'hsl(var(--bg3))',
    border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))', fontSize: 13, outline: 'none', marginTop: 4,
  };
  const pillBtn = (active: boolean): React.CSSProperties => ({
    ...mono, fontSize: 10, padding: '5px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
    background: active ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
    color: active ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))', fontWeight: active ? 700 : 400,
  });

  return (
    <AdminLayout>
    <div style={{ background: 'hsl(var(--bg))', minHeight: '100vh', padding: 16, paddingBottom: 80 }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: 'hsl(var(--text))', margin: 0, flex: 1 }}>CLIENTS</h1>
        <button onClick={openAddModal} style={{
          ...mono, fontSize: 10, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', border: 'none',
          background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700,
        }}>+ Add Client</button>
      </div>

      {/* SEARCH */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 8, padding: '8px 10px',
      }}>
        <Search size={14} style={{ color: 'hsl(var(--dim))', flexShrink: 0 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'hsl(var(--text))', fontSize: 12 }} />
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
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
          <div style={{ ...mono, fontSize: 10, color: 'hsl(var(--dim))' }}>Add a client to get started</div>
        </div>
      ) : (
        <div>
          {filtered.map(c => {
            const cb = compBadge(c.compliance);
            const name = c.full_name || c.email || 'Unknown';
            const tc = tierColor(c.tier);
            const lastActive = c.activeToday ? 'Active today' : c.lastSessionDate ? new Date(c.lastSessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No sessions';
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0',
                borderBottom: '1px solid hsl(var(--border))',
              }}>
                {/* Status dot */}
                <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => { e.stopPropagation(); setStatusDropdown(statusDropdown === c.id ? null : c.id); }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot(c.status), cursor: 'pointer' }} />
                  {statusDropdown === c.id && (
                    <div style={{ position: 'absolute', top: 16, left: -4, zIndex: 40, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 6, overflow: 'hidden', minWidth: 90 }}>
                      {STATUSES.map(s => (
                        <button key={s} onClick={e => { e.stopPropagation(); inlineStatusChange(c.id, s); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px', background: 'none', border: 'none', color: 'hsl(var(--text))', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot(s) }} />
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div onClick={() => navigate(`/admin/client/${c.id}`)} style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...mono, fontSize: 10, fontWeight: 700, color: 'hsl(var(--primary))',
                }}>{initials(name)}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/admin/client/${c.id}`)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.programmeName ? `${c.programmeName} · ` : ''}{lastActive}
                  </div>
                </div>

                {/* Tier badge (tappable) */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setTierDropdown(tierDropdown === c.id ? null : c.id); }}
                    style={{ ...mono, fontSize: 8, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: tc.bg, color: tc.color }}>
                    {tierLabel(c.tier)} <ChevronDown size={8} style={{ marginLeft: 2 }} />
                  </button>
                  {tierDropdown === c.id && (
                    <div style={{ position: 'absolute', top: 22, right: 0, zIndex: 40, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 6, overflow: 'hidden', minWidth: 90 }}>
                      {TIERS.map(t => (
                        <button key={t} onClick={e => { e.stopPropagation(); inlineTierChange(c.id, t); }}
                          style={{ display: 'block', width: '100%', padding: '6px 10px', background: 'none', border: 'none', color: 'hsl(var(--text))', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compliance */}
                <span style={{ ...mono, fontSize: 9, padding: '1px 6px', borderRadius: 3, background: cb.bg, color: cb.color, flexShrink: 0 }}>{c.compliance}%</span>

                {/* Edit */}
                <button onClick={e => { e.stopPropagation(); openEditModal(c); }}
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                  <Edit2 size={13} />
                </button>

                {/* Remove */}
                <button onClick={e => { e.stopPropagation(); setRemoveClient(c); }}
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--bad))', cursor: 'pointer', padding: 4, flexShrink: 0, opacity: 0.6 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* ─── ADD CLIENT MODAL ─── */}
    {showAddModal && (
      <div style={overlay} onClick={() => { if (!createdCreds) setShowAddModal(false); }}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'hsl(var(--primary))' }}>ADD CLIENT</span>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          {createdCreds ? (
            <div>
              <div style={{ ...mono, fontSize: 10, color: 'hsl(var(--ok))', marginBottom: 12 }}>Client created. Share these login details:</div>
              <div style={{ background: 'hsl(var(--bg3))', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--text))', marginBottom: 4 }}>Email: {createdCreds.email}</div>
                <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--text))' }}>Password: {createdCreds.password}</div>
              </div>
              <button onClick={() => copyToClipboard(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`)}
                style={{ ...mono, width: '100%', padding: '10px 0', borderRadius: 8, background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', marginBottom: 8 }}>
                Copy Credentials
              </button>
              <button onClick={() => setShowAddModal(false)}
                style={{ ...mono, width: '100%', padding: '8px 0', borderRadius: 8, background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))', fontSize: 11, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          ) : (
            <>
              <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Full Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="John Smith" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Email *</label>
              <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="client@email.com" type="email" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Password</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input value={formPassword} onChange={e => { setFormPassword(e.target.value); setFormAutoPassword(false); }}
                  placeholder="Min 6 characters" style={{ ...inputStyle, flex: 1, marginTop: 0 }} />
                <button onClick={() => { setFormPassword(generatePassword()); setFormAutoPassword(true); }}
                  style={{ ...mono, fontSize: 9, padding: '6px 10px', borderRadius: 6, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Auto
                </button>
              </div>

              <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Tier</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {TIERS.map(t => <button key={t} onClick={() => setFormTier(t)} style={pillBtn(formTier === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
              </div>

              <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Status</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {STATUSES.map(s => <button key={s} onClick={() => setFormStatus(s)} style={pillBtn(formStatus === s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>)}
              </div>

              <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Internal Notes</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes about this client..."
                rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 60, marginBottom: 16 }} />

              <button onClick={handleCreateClient} disabled={formSaving} style={{
                ...mono, width: '100%', padding: '12px 0', borderRadius: 8, background: 'hsl(var(--primary))',
                color: 'hsl(220,16%,6%)', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: formSaving ? 0.6 : 1,
              }}>{formSaving ? 'Creating...' : 'Create Client'}</button>
            </>
          )}
        </div>
      </div>
    )}

    {/* ─── EDIT CLIENT MODAL ─── */}
    {editingClient && (
      <div style={overlay} onClick={() => setEditingClient(null)}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'hsl(var(--primary))' }}>EDIT CLIENT</span>
            <button onClick={() => setEditingClient(null)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Full Name</label>
          <input value={formName} onChange={e => setFormName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

          <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Email</label>
          <input value={formEmail} readOnly style={{ ...inputStyle, marginBottom: 12, opacity: 0.5, cursor: 'not-allowed' }} />

          <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Tier</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {TIERS.map(t => <button key={t} onClick={() => setFormTier(t)} style={pillBtn(formTier === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
          </div>

          <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Status</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {STATUSES.map(s => <button key={s} onClick={() => setFormStatus(s)} style={pillBtn(formStatus === s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>)}
          </div>

          <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Internal Notes</label>
          <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes about this client..."
            rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 60, marginBottom: 16 }} />

          <button onClick={handleEditSave} disabled={formSaving} style={{
            ...mono, width: '100%', padding: '12px 0', borderRadius: 8, background: 'hsl(var(--primary))',
            color: 'hsl(220,16%,6%)', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: formSaving ? 0.6 : 1,
          }}>{formSaving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    )}

    {/* ─── REMOVE CONFIRM ─── */}
    {removeClient && (
      <div style={overlay} onClick={() => setRemoveClient(null)}>
        <div style={{ ...modal, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'hsl(var(--bad))', marginBottom: 12 }}>REMOVE CLIENT</div>
          <div style={{ fontSize: 13, color: 'hsl(var(--text))', marginBottom: 4 }}>Remove <strong>{removeClient.full_name || removeClient.email}</strong> as a client?</div>
          <div style={{ ...mono, fontSize: 10, color: 'hsl(var(--dim))', marginBottom: 16 }}>Their data will be preserved but they will lose app access.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRemoveClient(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleRemoveClient} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'hsl(var(--bad))', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
          </div>
        </div>
      </div>
    )}
    </AdminLayout>
  );
};

export default AdminClientsPage;
