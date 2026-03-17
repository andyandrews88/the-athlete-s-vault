import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Send, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  source: string | null;
  url: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  duration: string | null;
  is_new_drop: boolean | null;
  created_at: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const TYPES = ['video', 'podcast', 'article', 'pdf', 'newsletter'] as const;
const SOURCES = ['andy', 'curated'] as const;

const AdminLibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [contentType, setContentType] = useState<string>('video');
  const [source, setSource] = useState<string>('andy');
  const [tagsStr, setTagsStr] = useState('');
  const [isNewDrop, setIsNewDrop] = useState(false);
  const [saving, setSaving] = useState(false);

  // Send sheet
  const [sendItem, setSendItem] = useState<ContentItem | null>(null);
  const [sendToAll, setSendToAll] = useState(false);
  const [sendToClient, setSendToClient] = useState('');

  const loadData = useCallback(async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('content_items').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'client'),
    ]);
    setItems((c as ContentItem[]) || []);
    setClients((p as Profile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const autoFillFromYouTube = async (inputUrl: string) => {
    if (!inputUrl.includes('youtube.com') && !inputUrl.includes('youtu.be')) return;
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(inputUrl)}&format=json`);
      if (!res.ok) return;
      const data = await res.json();
      setTitle(data.title || '');
      setThumbnailUrl(data.thumbnail_url || '');
      setDescription(`Auto-pulled: ${data.title || ''} · YouTube`);
      setContentType('video');
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setUrl(''); setTitle(''); setDescription(''); setThumbnailUrl('');
    setContentType('video'); setSource('andy'); setTagsStr(''); setIsNewDrop(false);
  };

  const handlePublish = async () => {
    if (!title.trim()) { toast({ title: 'Title required' }); return; }
    setSaving(true);
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from('content_items').insert({
      title: title.trim(),
      description: description.trim() || null,
      content_type: contentType,
      source,
      url: url.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      tags,
      is_new_drop: isNewDrop,
      created_by: user?.id,
    } as any);
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message }); return; }
    toast({ title: 'Published!' });
    resetForm();
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('content_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Deleted' });
  };

  const handleToggleFeature = async (id: string, current: boolean) => {
    await supabase.from('content_items').update({ is_new_drop: !current } as any).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_new_drop: !current } : i));
  };

  const handleSend = async () => {
    if (!sendItem || !user) return;
    if (!sendToAll && !sendToClient) { toast({ title: 'Select a client' }); return; }
    const payload: any = {
      content_id: sendItem.id,
      sent_by: user.id,
      sent_to_all: sendToAll,
    };
    if (!sendToAll) payload.sent_to = sendToClient;
    await supabase.from('content_sends').insert(payload);
    toast({ title: sendToAll ? 'Sent to everyone' : 'Sent to client' });
    setSendItem(null);
    setSendToAll(false);
    setSendToClient('');
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'hsl(var(--bg))' }}>
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="p-1">
          <ArrowLeft size={20} style={{ color: 'hsl(var(--dim))' }} />
        </button>
        <h1 className="font-display text-[24px] tracking-wide" style={{ color: 'hsl(var(--text))' }}>LIBRARY ADMIN</h1>
        <span className="ml-auto font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary)/0.2)' }}>ADMIN</span>
      </div>

      <div className="px-4">
        {/* Add button */}
        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-full mb-4 gap-2 font-bold"
          style={{ background: showForm ? 'hsl(var(--bg3))' : 'hsl(var(--primary))', color: showForm ? 'hsl(var(--dim))' : 'hsl(220,16%,6%)' }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : '+ Add New Content'}
        </Button>

        {/* Add form */}
        {showForm && (
          <div className="rounded-[10px] p-4 mb-4 space-y-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
            {/* URL */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>YouTube URL or link</label>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onBlur={() => autoFillFromYouTube(url)}
                placeholder="https://youtube.com/watch?v=..."
                className="h-9 text-xs"
                style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }}
              />
            </div>

            {/* Preview */}
            {thumbnailUrl && (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                <img src={thumbnailUrl} alt="" className="w-full h-32 object-cover" />
                <div className="p-2">
                  <p className="text-[11px] font-semibold" style={{ color: 'hsl(var(--text))' }}>{title}</p>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
            </div>

            {/* Description */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md px-3 py-2 text-xs"
                style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))', border: '1px solid', color: 'hsl(var(--text))' }}
              />
            </div>

            {/* Type pills */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-wider block mb-1.5" style={{ color: 'hsl(var(--dim))' }}>Content Type</label>
              <div className="flex gap-1.5 flex-wrap">
                {TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setContentType(t)}
                    className="px-3 py-1 rounded-full font-mono text-[9px] uppercase"
                    style={{
                      background: contentType === t ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                      color: contentType === t ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                      fontWeight: contentType === t ? 700 : 500,
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Source pills */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-wider block mb-1.5" style={{ color: 'hsl(var(--dim))' }}>Source</label>
              <div className="flex gap-1.5">
                {SOURCES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className="px-3 py-1 rounded-full font-mono text-[9px] uppercase"
                    style={{
                      background: source === s ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                      color: source === s ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                      fontWeight: source === s ? 700 : 500,
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>Tags (comma separated)</label>
              <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="strength, mobility, mindset" className="h-9 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
            </div>

            {/* New drop toggle */}
            <div className="flex items-center justify-between">
              <label className="font-mono text-[9px] uppercase" style={{ color: 'hsl(var(--dim))' }}>Feature as New Drop</label>
              <Switch checked={isNewDrop} onCheckedChange={setIsNewDrop} />
            </div>

            <Button onClick={handlePublish} disabled={saving} className="w-full font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
              {saving ? 'Publishing...' : 'Publish to Library'}
            </Button>
          </div>
        )}

        {/* Content list */}
        <p className="font-mono text-[9px] uppercase tracking-[2px] mb-2" style={{ color: 'hsl(var(--primary))' }}>
          PUBLISHED CONTENT ({items.length})
        </p>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse mb-2" style={{ background: 'hsl(var(--bg2))' }} />
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'hsl(var(--dim))' }}>No content yet. Add your first item above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-[10px]"
                style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}
              >
                {/* Type icon */}
                <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--bg3))' }}>
                  <span className="text-[10px]">
                    {item.content_type === 'video' ? '▶' : item.content_type === 'podcast' ? '🎧' : item.content_type === 'newsletter' ? '📧' : '📄'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: 'hsl(var(--text))' }}>{item.title}</p>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-[8px] uppercase" style={{ color: 'hsl(var(--dim))' }}>{item.content_type}</span>
                    {item.duration && <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>{item.duration}</span>}
                    {item.is_new_drop && (
                      <span className="font-mono text-[7px] px-1 rounded" style={{ background: 'hsl(var(--bad))', color: 'white' }}>NEW</span>
                    )}
                  </div>
                </div>

                {/* Feature toggle */}
                <button
                  onClick={() => handleToggleFeature(item.id, !!item.is_new_drop)}
                  className="font-mono text-[7px] px-2 py-0.5 rounded shrink-0"
                  style={{
                    background: item.is_new_drop ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--bg3))',
                    color: item.is_new_drop ? 'hsl(var(--primary))' : 'hsl(var(--dim))',
                  }}
                >
                  {item.is_new_drop ? 'FEATURED' : 'FEATURE'}
                </button>

                {/* Send */}
                <button onClick={() => setSendItem(item)} className="p-1.5 rounded" style={{ color: 'hsl(var(--primary))' }}>
                  <Send size={14} />
                </button>

                {/* Delete */}
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded" style={{ color: 'hsl(var(--bad))' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Sheet */}
      <Sheet open={!!sendItem} onOpenChange={() => setSendItem(null)}>
        <SheetContent side="bottom" className="p-4" style={{ background: 'hsl(var(--bg))', border: 'none' }}>
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-display text-lg" style={{ color: 'hsl(var(--text))' }}>SEND CONTENT</SheetTitle>
          </SheetHeader>
          {sendItem && (
            <div className="space-y-4">
              <p className="text-[12px] font-semibold" style={{ color: 'hsl(var(--text))' }}>{sendItem.title}</p>

              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] uppercase" style={{ color: 'hsl(var(--dim))' }}>Send to Everyone</label>
                <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
              </div>

              {!sendToAll && (
                <Select value={sendToClient} onValueChange={setSendToClient}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: 'hsl(var(--bg2))', borderColor: 'hsl(var(--border2))' }}>
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={handleSend} className="w-full font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
                Send →
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminLibraryPage;
