import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Pencil, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const tierColor = (tier: string | null) => {
  switch (tier?.toLowerCase()) {
    case 'foundation': return { bg: 'hsla(0,72%,51%,0.12)', color: 'hsl(0,72%,51%)', border: 'hsla(0,72%,51%,0.25)' };
    case 'intermediate': return { bg: 'hsla(38,92%,50%,0.12)', color: 'hsl(38,92%,50%)', border: 'hsla(38,92%,50%,0.25)' };
    case 'performance': return { bg: 'hsla(192,91%,54%,0.12)', color: 'hsl(192,91%,54%)', border: 'hsla(192,91%,54%,0.25)' };
    case 'elite': return { bg: 'hsla(45,93%,58%,0.12)', color: 'hsl(45,93%,58%)', border: 'hsla(45,93%,58%,0.25)' };
    default: return { bg: 'hsla(215,14%,50%,0.12)', color: 'hsl(215,14%,50%)', border: 'hsla(215,14%,50%,0.25)' };
  }
};

const ProfilePage = () => {
  const { user, profile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('kg');
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);
  const [programme, setProgramme] = useState<any>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditUnit(profile.weight_unit || 'kg');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    // Fetch streak
    const fetchStreak = async () => {
      const { data } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(60);
      if (!data?.length) return;
      let count = 0;
      const today = new Date();
      for (let i = 0; i < data.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        const expStr = expected.toISOString().split('T')[0];
        if (data[i].date === expStr) count++;
        else break;
      }
      setStreak(count);
    };

    // Fetch active programme
    const fetchProgramme = async () => {
      const { data } = await supabase
        .from('training_programmes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setProgramme(data);
    };

    // Fetch audit history
    const fetchAudits = async () => {
      const { data } = await supabase
        .from('audit_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setAuditHistory(data || []);
    };

    fetchStreak();
    fetchProgramme();
    fetchAudits();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: editName,
      weight_unit: editUnit,
    }).eq('id', user.id);
    refetchProfile();
    setSaving(false);
    setEditing(false);
    toast({ title: 'Profile updated' });
  };

  const handleShare = () => {
    const link = `https://andy-vault-performance.lovable.app/ref/${profile?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
  };

  if (!profile) return null;

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const tc = tierColor(profile.audit_tier);

  return (
    <div className="px-4 pb-[80px] pt-4 max-w-lg mx-auto">
      {/* HEADER */}
      <div className="flex flex-col items-center text-center mb-6">
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'hsl(var(--bg3))',
            border: '2px solid hsl(var(--border2))',
            color: 'hsl(var(--primary))',
            fontFamily: 'JetBrains Mono',
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 2, color: 'hsl(var(--text))' }}>
          {profile.full_name}
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'hsl(var(--dim))' }}>
          {profile.email}
        </p>

        {profile.audit_tier && (
          <span
            className="mt-2 inline-block rounded"
            style={{
              fontFamily: 'JetBrains Mono',
              fontSize: 9,
              padding: '2px 8px',
              background: tc.bg,
              color: tc.color,
              border: `1px solid ${tc.border}`,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {profile.audit_tier}
          </span>
        )}

        <button
          onClick={() => setEditing(!editing)}
          className="mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs transition-colors"
          style={{
            border: '1px solid hsl(var(--primary))',
            color: 'hsl(var(--primary))',
            background: 'transparent',
            fontFamily: 'Inter',
          }}
        >
          <Pencil size={12} /> Edit Profile
        </button>
      </div>

      {/* EDIT FORM */}
      {editing && (
        <div className="rounded-lg p-4 mb-6" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Full Name</label>
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 mb-3 text-sm outline-none"
            style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))', fontFamily: 'Inter' }}
          />
          <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Email</label>
          <input
            value={profile.email || ''}
            readOnly
            className="w-full rounded-lg px-3 py-2 mb-3 text-sm outline-none opacity-50"
            style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--dim))', fontFamily: 'Inter' }}
          />
          <label className="block mb-1" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Weight Unit</label>
          <div className="flex gap-2 mb-4">
            {['kg', 'lbs'].map(u => (
              <button
                key={u}
                onClick={() => setEditUnit(u)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  fontFamily: 'JetBrains Mono',
                  background: editUnit === u ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                  color: editUnit === u ? 'hsl(var(--primary-foreground))' : 'hsl(var(--dim))',
                }}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg py-2.5 text-sm font-semibold"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="w-full mt-2 text-xs text-center py-1"
            style={{ color: 'hsl(var(--dim))' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* STATS ROW */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'AUDIT SCORE', value: profile.audit_score ?? '—' },
          { label: 'MEMBER SINCE', value: profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '—' },
          { label: 'STREAK', value: `${streak}d` },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-lg p-3 text-center"
            style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}
          >
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, color: 'hsl(var(--primary))', fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* MY PROGRAMME */}
      <div className="rounded-lg p-4 mb-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 8 }}>ACTIVE PROGRAMME</div>
        {programme ? (
          <>
            <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'hsl(var(--text))' }}>{programme.name}</div>
            <div className="mt-2 rounded-full overflow-hidden" style={{ height: 4, background: 'hsl(var(--bg3))' }}>
              <div style={{ width: '40%', height: '100%', background: 'hsl(var(--primary))', borderRadius: 999 }} />
            </div>
            <div className="mt-1" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(var(--dim))' }}>
              {programme.weeks ? `${programme.weeks} weeks` : ''} · {programme.days_per_week || '?'} days/week
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'hsl(var(--dim))' }}>No active programme</div>
            <button
              onClick={() => navigate('/library')}
              className="mt-2 text-xs"
              style={{ color: 'hsl(var(--primary))', fontFamily: 'Inter' }}
            >
              Browse Programmes →
            </button>
          </>
        )}
      </div>

      {/* AUDIT HISTORY */}
      <div className="rounded-lg p-4 mb-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 8 }}>AUDIT HISTORY</div>
        {auditHistory.length > 0 ? (
          auditHistory.map((a, i) => {
            const atc = tierColor(a.tier);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: i < auditHistory.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
              >
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(var(--dim))' }}>
                  {a.created_at ? format(new Date(a.created_at), 'dd MMM yyyy') : ''}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: 'hsl(var(--primary))', fontWeight: 600 }}>{a.score}</span>
                <span
                  className="rounded"
                  style={{
                    fontFamily: 'JetBrains Mono', fontSize: 8, padding: '2px 6px',
                    background: atc.bg, color: atc.color, border: `1px solid ${atc.border}`,
                    textTransform: 'uppercase',
                  }}
                >
                  {a.tier}
                </span>
              </div>
            );
          })
        ) : (
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: 'hsl(var(--dim))' }}>No audits yet</div>
        )}
        <button
          onClick={() => navigate('/audit')}
          className="mt-3 w-full rounded-lg py-2 text-xs"
          style={{ border: '1px solid hsl(var(--border2))', color: 'hsl(var(--dim))', background: 'transparent' }}
        >
          Retake Audit →
        </button>
      </div>

      {/* REFERRAL */}
      <div className="rounded-lg p-4 mb-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 8 }}>REFER A FRIEND</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: 'hsl(var(--primary))', letterSpacing: 4, textAlign: 'center' }}>
          {profile.referral_code || '—'}
        </div>
        <p className="text-center mt-1" style={{ fontFamily: 'Inter', fontSize: 11, color: 'hsl(var(--dim))' }}>
          Share your code. Earn rewards.
        </p>
        <button
          onClick={handleShare}
          className="w-full mt-3 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          <Copy size={14} /> Share Link
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
