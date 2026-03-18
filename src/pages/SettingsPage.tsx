import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ChevronRight, Lock, LogOut, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const sectionLabel = (text: string) => (
  <div className="mt-6 mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>
    {text}
  </div>
);

const SettingsPage = () => {
  const { user, profile, signOut, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [currency, setCurrency] = useState('GBP');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    checkin_reminder: true,
    coaching_notes: true,
    weekly_review: true,
    streak_reminder: true,
  });

  useEffect(() => {
    if (profile) {
      setNameVal(profile.full_name || '');
      setWeightUnit(profile.weight_unit || 'kg');
      setCurrency(profile.currency || 'GBP');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotifPrefs({
            checkin_reminder: data.checkin_reminder ?? true,
            coaching_notes: data.coaching_notes ?? true,
            weekly_review: data.weekly_review ?? true,
            streak_reminder: data.streak_reminder ?? true,
          });
        }
      });
  }, [user]);

  const saveField = async (field: string, value: any) => {
    if (!user) return;
    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
    refetchProfile();
  };

  const saveNotifPref = async (key: string, value: boolean) => {
    if (!user) return;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      ...updated,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    await supabase.auth.resetPasswordForEmail(profile.email);
    toast({ title: 'Reset email sent', description: 'Check your inbox for a password reset link.' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ role: 'deleted' }).eq('id', user.id);
    await signOut();
    navigate('/');
  };

  if (!profile) return null;

  const rowStyle = { borderBottom: '1px solid hsl(var(--border))', padding: '14px 0' };
  const labelStyle = { fontFamily: 'Inter' as const, fontSize: 13, color: 'hsl(var(--text))' };
  const dimStyle = { fontFamily: 'Inter' as const, fontSize: 12, color: 'hsl(var(--dim))' };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-[22px] rounded-full transition-colors"
      style={{ background: checked ? 'hsl(var(--primary))' : 'hsl(var(--bg3))' }}
    >
      <div
        className="absolute top-[2px] w-[18px] h-[18px] rounded-full transition-transform"
        style={{
          background: checked ? 'hsl(var(--primary-foreground))' : 'hsl(var(--dim))',
          left: checked ? 20 : 2,
        }}
      />
    </button>
  );

  return (
    <div className="px-4 pb-[80px] pt-4 max-w-lg mx-auto">
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: 'hsl(var(--text))', marginBottom: 8 }}>SETTINGS</h1>

      {/* ACCOUNT */}
      {sectionLabel('ACCOUNT')}

      {/* Name */}
      <div className="flex items-center justify-between" style={rowStyle}>
        <span style={labelStyle}>Full Name</span>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              className="rounded px-2 py-1 text-xs outline-none w-36"
              style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))' }}
              autoFocus
            />
            <button
              onClick={() => { saveField('full_name', nameVal); setEditingName(false); toast({ title: 'Name updated' }); }}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              Save
            </button>
          </div>
        ) : (
          <button onClick={() => setEditingName(true)} className="flex items-center gap-1">
            <span style={dimStyle}>{profile.full_name}</span>
            <ChevronRight size={14} style={{ color: 'hsl(var(--dim))' }} />
          </button>
        )}
      </div>

      {/* Email */}
      <div className="flex items-center justify-between" style={rowStyle}>
        <span style={labelStyle}>Email</span>
        <div className="flex items-center gap-2">
          <span style={dimStyle}>{profile.email}</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(var(--dim))' }}>Cannot change</span>
        </div>
      </div>

      {/* Password */}
      <div className="flex items-center justify-between" style={rowStyle}>
        <span style={labelStyle}>Password</span>
        <button onClick={handlePasswordReset} style={{ ...dimStyle, color: 'hsl(var(--primary))' }}>
          Change Password
        </button>
      </div>

      {/* Weight Unit */}
      <div className="flex items-center justify-between" style={rowStyle}>
        <span style={labelStyle}>Weight Unit</span>
        <div className="flex gap-1">
          {['kg', 'lbs'].map(u => (
            <button
              key={u}
              onClick={() => { setWeightUnit(u); saveField('weight_unit', u); }}
              className="px-3 py-1 rounded text-xs font-semibold"
              style={{
                fontFamily: 'JetBrains Mono',
                background: weightUnit === u ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                color: weightUnit === u ? 'hsl(var(--primary-foreground))' : 'hsl(var(--dim))',
              }}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="flex items-center justify-between" style={rowStyle}>
        <span style={labelStyle}>Currency Display</span>
        <div className="flex gap-1">
          {['LKR', 'USD', 'GBP'].map(c => (
            <button
              key={c}
              onClick={() => { setCurrency(c); saveField('currency', c); }}
              className="px-3 py-1 rounded text-xs font-semibold"
              style={{
                fontFamily: 'JetBrains Mono',
                background: currency === c ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                color: currency === c ? 'hsl(var(--primary-foreground))' : 'hsl(var(--dim))',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {sectionLabel('NOTIFICATIONS')}
      {[
        { key: 'checkin_reminder', label: 'Daily Check-in Reminder', sub: '8:00 AM reminder if not checked in' },
        { key: 'coaching_notes', label: 'Coaching Notes', sub: 'When Andy leaves you a note' },
        { key: 'weekly_review', label: 'Weekly Review Ready', sub: 'When your AI review generates' },
        { key: 'streak_reminder', label: 'Streak Reminders', sub: 'If no training for 2 days' },
      ].map(item => (
        <div key={item.key} className="flex items-center justify-between" style={rowStyle}>
          <div>
            <div style={labelStyle}>{item.label}</div>
            <div style={{ fontFamily: 'Inter', fontSize: 10, color: 'hsl(var(--dim))', marginTop: 1 }}>{item.sub}</div>
          </div>
          <ToggleSwitch
            checked={(notifPrefs as any)[item.key]}
            onChange={v => saveNotifPref(item.key, v)}
          />
        </div>
      ))}

      {/* PRIVACY */}
      {sectionLabel('PRIVACY')}
      {[
        { label: 'Progress Photos', sub: 'Only visible to you and Andy' },
        { label: 'Profile Visibility', sub: 'Only Andy can see your data' },
      ].map(item => (
        <div key={item.label} className="flex items-center justify-between" style={rowStyle}>
          <div>
            <div style={labelStyle}>{item.label}</div>
            <div style={{ fontFamily: 'Inter', fontSize: 10, color: 'hsl(var(--dim))', marginTop: 1 }}>{item.sub}</div>
          </div>
          <Lock size={14} style={{ color: 'hsl(var(--dim))' }} />
        </div>
      ))}

      {/* SUBSCRIPTION */}
      {sectionLabel('SUBSCRIPTION')}
      <div className="flex items-center justify-between" style={rowStyle}>
        <div>
          <div style={labelStyle}>{profile.tier === 'free' ? 'Free Plan' : 'Pro Plan'}</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(var(--dim))', marginTop: 1 }}>
            {profile.tier === 'free' ? '2 AI prompts/day' : 'Unlimited AI'}
          </div>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {profile.tier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
        </button>
      </div>

      {/* DANGER ZONE */}
      <div className="mt-6 mb-2" style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(var(--bad))', textTransform: 'uppercase', letterSpacing: 1 }}>
        DANGER ZONE
      </div>

      <button
        onClick={handleSignOut}
        className="w-full rounded-lg py-3 mb-2 flex items-center justify-center gap-2 text-sm"
        style={{ background: 'transparent', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--dim))' }}
      >
        <LogOut size={14} /> Sign Out
      </button>

      <button
        onClick={() => setDeleteOpen(true)}
        className="w-full rounded-lg py-3 flex items-center justify-center gap-2 text-sm"
        style={{ background: 'transparent', border: '1px solid hsla(0,72%,51%,0.3)', color: 'hsl(var(--bad))' }}
      >
        <Trash2 size={14} /> Delete Account
      </button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--bad))' }}>Delete Account</DialogTitle>
            <DialogDescription>
              This permanently deletes all your data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setDeleteOpen(false)}
              className="flex-1 rounded-lg py-2 text-sm"
              style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              className="flex-1 rounded-lg py-2 text-sm font-semibold"
              style={{ background: 'hsl(var(--bad))', color: 'hsl(var(--text))' }}
            >
              Delete Forever
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
