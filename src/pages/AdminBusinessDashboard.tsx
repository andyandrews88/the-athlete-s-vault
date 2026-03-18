import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

interface Invoice { id: string; amount: number; currency: string | null; status: string | null; client_id: string; notes: string | null; created_at: string | null; }
interface PtPkg { id: string; name: string; sessions_total: number; sessions_used: number | null; client_id: string; status: string | null; }
interface PriceSetting { id: string; service_name: string; price_lkr: number | null; price_usd: number | null; show_on_landing: boolean | null; display_order: number | null; }
interface Profile { id: string; full_name: string | null; }
interface Programme { id: string; name: string; user_id: string; }

const formatK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);

const AdminBusinessDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState<PtPkg[]>([]);
  const [pricing, setPricing] = useState<PriceSetting[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [exchangeRate, setExchangeRate] = useState(326);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('pt_packages').select('*').eq('status', 'active'),
      supabase.from('pricing_settings').select('*').order('display_order'),
      supabase.from('profiles').select('id, full_name').eq('role', 'client'),
      supabase.from('training_programmes').select('id, name, user_id').eq('is_active', true),
    ]).then(([{ data: inv }, { data: pkg }, { data: pr }, { data: prof }, { data: prog }]) => {
      setInvoices((inv || []) as Invoice[]);
      setPackages((pkg || []) as PtPkg[]);
      const prList = (pr || []) as PriceSetting[];
      const rateRow = prList.find(p => p.service_name === 'exchange_rate');
      if (rateRow?.price_lkr) setExchangeRate(Number(rateRow.price_lkr));
      setPricing(prList.filter(p => p.service_name !== 'exchange_rate'));
      const map: Record<string, string> = {};
      (prof || []).forEach((p: any) => { map[p.id] = p.full_name || 'Client'; });
      setProfiles(map);
      setProgrammes((prog || []) as Programme[]);
    });
  }, []);

  // Revenue calcs
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthInvoices = invoices.filter(i => i.created_at?.startsWith(thisMonth));
  const revenue = thisMonthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const invoiced = thisMonthInvoices.reduce((s, i) => s + i.amount, 0);
  const outstanding = thisMonthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  // Chart — last 4 months
  const chartData = useMemo(() => {
    const months: { month: string; amount: number; current: boolean }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en', { month: 'short' });
      const amount = invoices.filter(inv => inv.created_at?.startsWith(key) && inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
      months.push({ month: label, amount, current: i === 0 });
    }
    return months;
  }, [invoices]);

  // Clients by programme
  const progCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    programmes.forEach(p => { counts[p.name] = (counts[p.name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [programmes]);

  const progColors = ['hsl(var(--primary))', 'hsl(var(--ok))', 'hsl(var(--warn))', 'hsl(262,60%,55%)'];

  const outstandingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'draft');

  const handleMarkPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
    toast({ title: 'Marked as paid' });
  };

  const updatePricing = (idx: number, field: string, value: any) => {
    setPricing(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleSavePricing = async () => {
    setSaving(true);
    for (const p of pricing) {
      await supabase.from('pricing_settings').update({
        price_lkr: p.price_lkr,
        price_usd: p.price_usd,
        show_on_landing: p.show_on_landing,
      } as any).eq('id', p.id);
    }
    // Save exchange rate
    await supabase.from('pricing_settings').update({ price_lkr: exchangeRate } as any).eq('service_name', 'exchange_rate');
    setSaving(false);
    toast({ title: 'Pricing saved!' });
  };

  const monthLabel = now.toLocaleDateString('en', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <AdminLayout>
    <div className="min-h-screen pb-24" style={{ background: 'hsl(var(--bg))' }}>
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <h1 className="font-display text-[28px] tracking-wide" style={{ color: 'hsl(var(--text))' }}>BUSINESS</h1>
        <span className="ml-auto font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary)/0.2)' }}>ADMIN</span>
      </div>
      <p className="px-4 text-[11px] mb-4" style={{ color: 'hsl(var(--dim))' }}>Revenue · programmes · payment plans</p>

      <div className="px-4 space-y-6 max-w-3xl mx-auto">
        {/* Revenue */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[2px] mb-3" style={{ color: 'hsl(var(--dim))' }}>{monthLabel}</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'REVENUE', value: formatK(revenue), color: 'hsl(var(--primary))' },
              { label: 'INVOICED', value: formatK(invoiced), color: 'hsl(var(--text))' },
              { label: 'OUTSTANDING', value: formatK(outstanding), color: 'hsl(var(--warn))' },
            ].map(m => (
              <div key={m.label} className="rounded-[10px] p-3 text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                <p className="font-mono text-[20px] font-bold" style={{ color: m.color }}>{m.value}</p>
                <p className="font-mono text-[7px] uppercase tracking-widest" style={{ color: 'hsl(var(--dim))' }}>{m.label}</p>
                <p className="font-mono text-[7px]" style={{ color: 'hsl(var(--dim))' }}>LKR</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-[10px] p-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.current ? 'hsl(192,91%,54%)' : 'hsl(192,91%,54%,0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clients by Programme */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[2px] mb-3" style={{ color: 'hsl(var(--dim))' }}>CLIENTS BY PROGRAMME</p>
          <div className="space-y-2">
            {progCounts.map(([name, count], i) => {
              const maxCount = Math.max(...progCounts.map(([, c]) => c));
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[12px] w-28 truncate" style={{ color: 'hsl(var(--text))' }}>{name}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'hsl(var(--bg3))' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%`, background: progColors[i % progColors.length] }} />
                  </div>
                  <span className="font-mono text-[12px] w-6 text-right" style={{ color: 'hsl(var(--text))' }}>{count}</span>
                </div>
              );
            })}
            {progCounts.length === 0 && <p className="text-[11px] text-center py-4" style={{ color: 'hsl(var(--dim))' }}>No active programmes</p>}
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[2px] mb-3" style={{ color: outstandingInvoices.length > 0 ? 'hsl(var(--bad))' : 'hsl(var(--dim))' }}>
            OUTSTANDING INVOICES ({outstandingInvoices.length})
          </p>
          {outstandingInvoices.length === 0 ? (
            <p className="text-[11px] text-center py-4" style={{ color: 'hsl(var(--dim))' }}>No outstanding invoices</p>
          ) : (
            <div className="space-y-2">
              {outstandingInvoices.map(inv => (
                <div key={inv.id} className="rounded-[10px] p-3" style={{ background: 'hsla(0,72%,51%,0.04)', border: '1px solid hsl(var(--bad)/0.2)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: 'hsl(var(--text))' }}>{profiles[inv.client_id] || 'Client'}</p>
                      <p className="text-[10px]" style={{ color: 'hsl(var(--dim))' }}>{inv.notes || 'Invoice'}</p>
                    </div>
                    <span className="font-mono text-[13px] font-bold" style={{ color: 'hsl(var(--bad))' }}>{formatK(inv.amount)} LKR</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>{inv.created_at?.split('T')[0]}</span>
                    <button onClick={() => handleMarkPaid(inv.id)} className="font-mono text-[9px] px-3 py-1 rounded font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))', border: '1px solid hsl(var(--ok)/0.2)' }}>Mark Paid</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PT Package Usage */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[2px] mb-3" style={{ color: 'hsl(var(--dim))' }}>PT PACKAGE USAGE</p>
          {packages.length === 0 ? (
            <p className="text-[11px] text-center py-4" style={{ color: 'hsl(var(--dim))' }}>No active packages</p>
          ) : (
            <div className="space-y-2">
              {packages.map(pkg => {
                const used = pkg.sessions_used || 0;
                const pct = Math.round((used / pkg.sessions_total) * 100);
                const barColor = pct > 80 ? 'hsl(var(--bad))' : pct > 50 ? 'hsl(var(--warn))' : 'hsl(var(--primary))';
                return (
                  <div key={pkg.id} className="rounded-[10px] p-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--primary))' }}>
                          {(profiles[pkg.client_id] || 'C')[0]}
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: 'hsl(var(--text))' }}>{profiles[pkg.client_id] || 'Client'}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold" style={{ color: barColor }}>{used}/{pkg.sessions_total}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--bg3))' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing Settings */}
        <div>
          <h2 className="font-display text-[20px] tracking-wide mb-0.5" style={{ color: 'hsl(var(--text))' }}>PRICING SETTINGS</h2>
          <p className="text-[11px] mb-4" style={{ color: 'hsl(var(--dim))' }}>Editable · LKR + USD · toggle visibility</p>

          <div className="space-y-3">
            {pricing.map((p, idx) => (
              <div key={p.id} className="rounded-[10px] p-[14px]" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase" style={{ color: 'hsl(var(--dim))' }}>{p.service_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{ color: 'hsl(var(--dim))' }}>Landing</span>
                    <Switch checked={!!p.show_on_landing} onCheckedChange={v => updatePricing(idx, 'show_on_landing', v)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[7px] uppercase block mb-1" style={{ color: 'hsl(var(--dim))' }}>LKR / month</label>
                    <Input type="number" value={p.price_lkr || ''} onChange={e => {
                      const lkr = Number(e.target.value);
                      updatePricing(idx, 'price_lkr', lkr);
                      updatePricing(idx, 'price_usd', Math.round(lkr / exchangeRate));
                    }} className="h-8 text-xs font-mono" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
                  </div>
                  <div>
                    <label className="font-mono text-[7px] uppercase block mb-1" style={{ color: 'hsl(var(--dim))' }}>USD / month</label>
                    <Input type="number" value={p.price_usd || ''} onChange={e => updatePricing(idx, 'price_usd', Number(e.target.value))} className="h-8 text-xs font-mono" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
                  </div>
                </div>
              </div>
            ))}

            {/* Exchange rate */}
            <div className="rounded-[10px] p-[14px]" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
              <label className="font-mono text-[9px] uppercase block mb-2" style={{ color: 'hsl(var(--dim))' }}>USD/LKR exchange rate (for display)</label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] shrink-0" style={{ color: 'hsl(var(--dim))' }}>1 USD =</span>
                <Input type="number" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} className="h-8 text-xs font-mono flex-1" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
                <span className="text-[11px] shrink-0" style={{ color: 'hsl(var(--dim))' }}>LKR</span>
              </div>
            </div>

            <Button onClick={handleSavePricing} disabled={saving} className="w-full font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
              {saving ? 'Saving...' : 'Save All Pricing'}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
};

export default AdminBusinessDashboard;
