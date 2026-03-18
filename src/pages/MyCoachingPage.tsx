import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react';

interface Programme {
  id: string; name: string; weeks: number | null;
  days_per_week: number | null; is_active: boolean; created_at: string | null;
}
interface PtPackage {
  id: string; name: string; sessions_total: number;
  sessions_used: number | null; start_date: string | null; status: string | null;
}
interface Invoice {
  id: string; amount: number; currency: string | null;
  status: string | null; notes: string | null; created_at: string | null;
  paid_at: string | null;
}

const statusBadge = (status: string | null) => {
  const s = (status || 'draft').toLowerCase();
  const colors: Record<string, { bg: string; text: string }> = {
    paid: { bg: 'hsl(var(--ok)/0.1)', text: 'hsl(var(--ok))' },
    sent: { bg: 'hsl(var(--primary)/0.1)', text: 'hsl(var(--primary))' },
    overdue: { bg: 'hsl(var(--bad)/0.1)', text: 'hsl(var(--bad))' },
    draft: { bg: 'hsl(var(--bg3))', text: 'hsl(var(--dim))' },
  };
  const c = colors[s] || colors.draft;
  return <span className="font-mono text-[8px] px-2 py-0.5 rounded font-bold uppercase" style={{ background: c.bg, color: c.text }}>{s}</span>;
};

const formatAmount = (amount: number, currency: string | null) => {
  const c = currency || 'LKR';
  return `${amount.toLocaleString()} ${c}`;
};

const MyCoachingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [ptPackage, setPtPackage] = useState<PtPackage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    supabase.from('training_programmes').select('*').eq('user_id', uid).eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setProgramme(data as Programme); });

    supabase.from('pt_packages').select('*').eq('client_id', uid).eq('status', 'active').limit(1).single()
      .then(({ data }) => { if (data) setPtPackage(data as PtPackage); });

    supabase.from('invoices').select('*').eq('client_id', uid).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setInvoices(data as Invoice[]); });
  }, [user]);

  const progWeeks = programme?.weeks || 12;
  // Estimate current week from created_at
  const currentWeek = programme?.created_at
    ? Math.min(progWeeks, Math.max(1, Math.ceil((Date.now() - new Date(programme.created_at).getTime()) / (7 * 86400000))))
    : 1;
  const progPct = Math.round((currentWeek / progWeeks) * 100);

  const sessionsUsed = ptPackage?.sessions_used || 0;
  const sessionsTotal = ptPackage?.sessions_total || 1;
  const sessionsRemaining = sessionsTotal - sessionsUsed;
  const sessionsPct = Math.round((sessionsUsed / sessionsTotal) * 100);

  const hasOutstanding = invoices.some(i => i.status !== 'paid');

  return (
    <div className="min-h-screen pb-24 pt-14" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')} className="flex items-center gap-2 p-0">
          <ArrowLeft size={18} className="text-primary" />
          <span className="text-xs" style={{ color: 'hsl(var(--dim))' }}>Back</span>
        </button>
        <div>
          <h1 className="font-display text-[28px] tracking-wide" style={{ color: 'hsl(var(--text))' }}>MY COACHING</h1>
          <p className="text-[11px]" style={{ color: 'hsl(var(--dim))' }}>Your programme, sessions & billing</p>
        </div>

        {/* Programme Card */}
        <div className="rounded-[12px] p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8px] uppercase tracking-[2px]" style={{ color: 'hsl(var(--dim))' }}>PROGRAMME</span>
            {programme && <span className="font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))' }}>ACTIVE</span>}
          </div>
          {programme ? (
            <>
              <p className="text-[16px] font-bold mb-1" style={{ color: 'hsl(var(--text))' }}>{programme.name}</p>
              <p className="font-mono text-[9px] mb-3" style={{ color: 'hsl(var(--dim))' }}>
                WEEK {currentWeek} OF {progWeeks} · {programme.days_per_week || 4} DAYS/WEEK
              </p>
              <Progress value={progPct} className="h-1" />
              <div className="flex justify-between mt-1.5">
                <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>Week 1</span>
                <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>{progPct}% complete</span>
                <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>Week {progWeeks}</span>
              </div>
            </>
          ) : (
            <p className="text-[11px] py-4 text-center" style={{ color: 'hsl(var(--dim))' }}>No active programme assigned</p>
          )}
        </div>

        {/* PT Sessions Card */}
        <div className="rounded-[12px] p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8px] uppercase tracking-[2px]" style={{ color: 'hsl(var(--dim))' }}>PT SESSIONS</span>
            {ptPackage && <span className="font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))' }}>ACTIVE PACKAGE</span>}
          </div>
          {ptPackage ? (
            <>
              <p className="text-[14px] font-semibold mb-2" style={{ color: 'hsl(var(--text))' }}>{ptPackage.name}</p>
              <Progress value={sessionsPct} className="h-1 mb-2" />
              <div className="flex justify-between items-baseline">
                <p className="font-mono text-[9px]" style={{ color: 'hsl(var(--dim))' }}>
                  {sessionsUsed} used of {sessionsTotal} · Package started {ptPackage.start_date || '—'}
                </p>
                <span className="font-mono text-[11px] font-bold" style={{ color: 'hsl(var(--primary))' }}>{sessionsRemaining} remaining</span>
              </div>
            </>
          ) : (
            <p className="text-[11px] py-4 text-center" style={{ color: 'hsl(var(--dim))' }}>No active PT package</p>
          )}
        </div>

        {/* Billing Card */}
        <div className="rounded-[12px] p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[8px] uppercase tracking-[2px]" style={{ color: 'hsl(var(--dim))' }}>BILLING</span>
            {hasOutstanding
              ? <span className="font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--bad)/0.1)', color: 'hsl(var(--bad))' }}>OUTSTANDING</span>
              : <span className="font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))' }}>ALL CLEAR</span>
            }
          </div>
          {invoices.length === 0 ? (
            <p className="text-[11px] py-4 text-center" style={{ color: 'hsl(var(--dim))' }}>No invoices</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'hsl(var(--bg3))' }}>
                  <div>
                    <p className="text-[12px] font-medium" style={{ color: 'hsl(var(--text))' }}>{inv.notes || 'Invoice'}</p>
                    <p className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>{inv.created_at?.split('T')[0]}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-mono text-[12px] font-bold" style={{ color: 'hsl(var(--text))' }}>{formatAmount(inv.amount, inv.currency)}</span>
                    {statusBadge(inv.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Andy */}
        <button onClick={() => navigate('/community')} className="w-full rounded-[12px] p-4 text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))' }}>
          <span className="text-[13px] font-semibold" style={{ color: 'hsl(var(--primary))' }}>Message Andy 💬</span>
        </button>
      </div>
    </div>
  );
};

export default MyCoachingPage;
