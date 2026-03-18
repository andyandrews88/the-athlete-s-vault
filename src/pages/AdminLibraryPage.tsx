import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Send, Plus, X, Search, FileText, Link2, StickyNote, RefreshCw } from 'lucide-react';
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

interface Announcement {
  id: string;
  content: string;
  is_active: boolean;
  created_at: string | null;
}

interface Exercise {
  id: string;
  name: string;
  movement_pattern: string | null;
  difficulty_coefficient: number | null;
  is_custom: boolean | null;
  approved: boolean | null;
}

const TYPES = ['video', 'podcast', 'article', 'pdf', 'newsletter'] as const;
const SOURCES = ['andy', 'curated'] as const;

const channelColorMap: Record<string, string> = {
  primary: 'hsl(192,91%,54%)',
  ok: 'hsl(142,71%,45%)',
  gold: 'hsl(45,93%,58%)',
  warn: 'hsl(38,92%,50%)',
  purple: 'hsl(262,60%,55%)',
  bad: 'hsl(0,72%,51%)',
};

interface CommunityChannel {
  id: string;
  name: string;
  color: string | null;
}

const KB_CATEGORIES = ['Nutrition', 'Training', 'Lifestyle', 'Sleep', 'Mindset', 'General'] as const;

const categoryBadgeStyles: Record<string, { bg: string; color: string }> = {
  Nutrition: { bg: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))' },
  Training: { bg: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' },
  Lifestyle: { bg: 'hsl(var(--warn)/0.1)', color: 'hsl(var(--warn))' },
  Sleep: { bg: 'hsla(262,60%,55%,0.1)', color: 'hsl(262,60%,70%)' },
  Mindset: { bg: 'hsl(var(--gold)/0.1)', color: 'hsl(var(--gold))' },
  General: { bg: 'hsl(var(--dim)/0.1)', color: 'hsl(var(--dim))' },
};

interface KBEntry {
  id: string;
  title: string;
  content: string;
  category: string | null;
  source: string | null;
  source_type: string | null;
  word_count: number | null;
  created_at: string | null;
}

const AIKnowledgeBaseSection = ({ userId }: { userId?: string }) => {
  const [mode, setMode] = useState<'doc' | 'url' | 'note'>('doc');
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [category, setCategory] = useState('General');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  // URL mode
  const [kbUrl, setKbUrl] = useState('');
  const [urlMeta, setUrlMeta] = useState<{ title?: string; thumbnail?: string } | null>(null);

  // Note mode
  const [noteText, setNoteText] = useState('');

  const loadEntries = useCallback(async () => {
    const { data } = await supabase.from('ai_knowledge_base').select('*').order('created_at', { ascending: false });
    setEntries((data as any as KBEntry[]) || []);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const stats = {
    documents: entries.filter(e => e.source_type === 'document').length,
    urls: entries.filter(e => e.source_type === 'url').length,
    notes: entries.filter(e => e.source_type === 'note').length,
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB' });
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setFileContent(text.slice(0, 10000));
    if (!label) setLabel(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUrlBlur = async () => {
    if (!kbUrl.includes('youtube.com') && !kbUrl.includes('youtu.be')) {
      setUrlMeta(null);
      return;
    }
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(kbUrl)}&format=json`);
      if (!res.ok) return;
      const data = await res.json();
      setUrlMeta({ title: data.title, thumbnail: data.thumbnail_url });
      if (!label) setLabel(data.title || '');
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (!label.trim()) { toast({ title: 'Label required' }); return; }
    setSaving(true);

    let content = '';
    let sourceType = 'document';
    let source: string | null = null;

    if (mode === 'doc') {
      if (!fileContent) { toast({ title: 'Select a file first' }); setSaving(false); return; }
      content = fileContent;
      sourceType = 'document';
      source = fileName;
    } else if (mode === 'url') {
      if (!kbUrl.trim()) { toast({ title: 'Enter a URL' }); setSaving(false); return; }
      const urlTitle = urlMeta?.title || kbUrl;
      content = `${kbUrl} - ${urlTitle} [URL source - content will be referenced by URL]`;
      sourceType = 'url';
      source = kbUrl;
    } else {
      if (!noteText.trim()) { toast({ title: 'Write some content' }); setSaving(false); return; }
      content = noteText;
      sourceType = 'note';
      source = null;
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const { error } = await supabase.from('ai_knowledge_base').insert({
      title: label.trim(),
      content,
      category,
      source_type: sourceType,
      source,
      word_count: wordCount,
      created_by: userId,
    } as any);

    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message }); return; }
    toast({ title: 'Added to knowledge base' });
    setLabel('');
    setFileName('');
    setFileContent('');
    setKbUrl('');
    setUrlMeta(null);
    setNoteText('');
    setCategory('General');
    loadEntries();
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this knowledge source?')) return;
    await supabase.from('ai_knowledge_base').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
    toast({ title: 'Deleted' });
  };

  const filtered = entries.filter(e => !kbSearch.trim() || e.title.toLowerCase().includes(kbSearch.toLowerCase()));

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const sourceLabel = (e: KBEntry) => {
    if (e.source_type === 'document') return `PDF · Uploaded ${formatDate(e.created_at)}`;
    if (e.source_type === 'url') {
      const domain = e.source ? new URL(e.source).hostname.replace('www.', '').slice(0, 20) : '';
      return `URL · ${domain}… · ${formatDate(e.created_at)}`;
    }
    const wc = e.word_count || e.content.split(/\s+/).length;
    return `Text note · ${wc} words · ${formatDate(e.created_at)}`;
  };

  return (
    <div className="mt-8">
      <h2 className="font-display text-[24px] tracking-wide mb-0.5" style={{ color: 'hsl(var(--text))' }}>AI KNOWLEDGE BASE</h2>
      <p className="text-[11px] mb-4" style={{ color: 'hsl(var(--dim))' }}>Feed the AI — it learns from your content</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'DOCUMENTS', value: stats.documents },
          { label: 'URLS', value: stats.urls },
          { label: 'TEXT NOTES', value: stats.notes },
        ].map(s => (
          <div key={s.label} className="rounded-[8px] p-3 text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
            <p className="font-mono text-[20px] font-bold" style={{ color: 'hsl(var(--primary))' }}>{s.value}</p>
            <p className="font-mono text-[7px] uppercase tracking-wider" style={{ color: 'hsl(var(--dim))' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: 'doc', label: 'Upload Doc', icon: <FileText size={12} /> },
          { key: 'url', label: 'Paste URL', icon: <Link2 size={12} /> },
          { key: 'note', label: 'Write Note', icon: <StickyNote size={12} /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[7px] font-mono text-[9px] font-bold transition-colors"
            style={{
              background: mode === t.key ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
              color: mode === t.key ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="rounded-[10px] p-4 mb-4 space-y-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        {mode === 'doc' && (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-[8px] p-6 text-center cursor-pointer transition-colors hover:opacity-80"
              style={{ background: 'hsl(var(--bg3))', border: '2px dashed hsl(var(--border2))' }}
            >
              <p className="text-[32px] mb-1">📄</p>
              {fileName ? (
                <p className="text-[12px] font-semibold" style={{ color: 'hsl(var(--primary))' }}>{fileName}</p>
              ) : (
                <>
                  <p className="text-[12px]" style={{ color: 'hsl(var(--dim))' }}>Drop file here or tap to upload</p>
                  <p className="font-mono text-[9px] mt-1" style={{ color: 'hsl(var(--dim))' }}>PDF, DOCX, TXT · Max 10MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileSelect} />
          </>
        )}

        {mode === 'url' && (
          <>
            <Input
              value={kbUrl}
              onChange={e => setKbUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://youtube.com/watch?v=..."
              className="h-9 text-xs"
              style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }}
            />
            {urlMeta && (
              <div className="flex items-center gap-3 rounded-[8px] p-2" style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}>
                {urlMeta.thumbnail && <img src={urlMeta.thumbnail} alt="" className="w-16 h-10 rounded object-cover" />}
                <p className="font-mono text-[9px]" style={{ color: 'hsl(var(--primary))' }}>Auto-pulled: {urlMeta.title} · YouTube</p>
              </div>
            )}
          </>
        )}

        {mode === 'note' && (
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Write Andy's coaching philosophy, methodology notes, or any text you want the AI to know..."
            rows={5}
            className="w-full rounded-[7px] px-3 py-2 text-[12px]"
            style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))', minHeight: 120 }}
          />
        )}

        {/* Label */}
        <Input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label (what is this?)"
          className="h-9 text-xs"
          style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }}
        />

        {/* Category pills */}
        <div>
          <p className="font-mono text-[8px] uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--dim))' }}>Category</p>
          <div className="flex gap-1.5 flex-wrap">
            {KB_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1 rounded-full font-mono text-[9px]"
                style={{
                  background: category === c ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                  color: category === c ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                  fontWeight: category === c ? 700 : 500,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="w-full font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
          {saving ? 'Adding...' : 'Add to Knowledge Base'}
        </Button>
      </div>

      {/* Library auto-sync info */}
      <div className="rounded-[8px] p-3 mb-6" style={{ background: 'hsl(var(--bg3))', border: '1px solid hsla(192,91%,54%,0.25)' }}>
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw size={14} style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'hsl(var(--text))' }}>Library Auto-Sync</span>
        </div>
        <p className="text-[11px]" style={{ color: 'hsl(var(--mid))' }}>
          All content published to the Library is automatically available to the AI. When you add a podcast, article or video — the AI knows about it.
        </p>
      </div>

      {/* Knowledge sources list */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[2px] mb-0.5" style={{ color: 'hsl(var(--dim))' }}>KNOWLEDGE SOURCES</p>
        <p className="text-[11px] mb-3" style={{ color: 'hsl(var(--dim))' }}>{entries.length} sources · AI trained on all of these</p>

        <div className="mb-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--dim))' }} />
          <Input
            value={kbSearch}
            onChange={e => setKbSearch(e.target.value)}
            placeholder="Search knowledge sources..."
            className="h-9 text-xs pl-9"
            style={{ background: 'hsl(var(--bg2))', borderColor: 'hsl(var(--border2))' }}
          />
        </div>

        <div className="space-y-1.5">
          {filtered.map(entry => {
            const catStyle = categoryBadgeStyles[entry.category || 'General'] || categoryBadgeStyles.General;
            return (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-[8px]" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'hsl(var(--text))' }}>{entry.title}</p>
                  <p className="font-mono text-[9px] mt-0.5" style={{ color: 'hsl(var(--dim))' }}>{sourceLabel(entry)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: catStyle.bg, color: catStyle.color }}>{entry.category || 'General'}</span>
                  <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))', border: '1px solid hsl(var(--ok)/0.2)' }}>✓ Indexed</span>
                  <button onClick={() => handleDeleteEntry(entry.id)} className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--bad))' }}>Delete ×</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-6">
              <p className="text-[11px]" style={{ color: 'hsl(var(--dim))' }}>No knowledge sources yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

  // Announcements
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [editAnnouncementText, setEditAnnouncementText] = useState('');

  // Exercises
  const [pendingExercises, setPendingExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exercisePage, setExercisePage] = useState(0);
  const [exerciseTotal, setExerciseTotal] = useState(0);

  // Community channels
  const [communityChannels, setCommunityChannels] = useState<CommunityChannel[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelColor, setNewChannelColor] = useState('primary');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');

  const EXERCISE_PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('content_items').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'client'),
    ]);
    setItems((c as ContentItem[]) || []);
    setClients((p as Profile[]) || []);
    setLoading(false);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').eq('is_active', true).limit(1).single();
    setActiveAnnouncement(data as Announcement | null);
  }, []);

  const loadExercises = useCallback(async () => {
    // Pending
    const { data: pending } = await supabase.from('exercises').select('*').eq('is_custom', true).or('approved.is.null,approved.eq.false');
    setPendingExercises((pending as Exercise[]) || []);

    // All exercises with search + pagination
    let query = supabase.from('exercises').select('*', { count: 'exact' }).order('name');
    if (exerciseSearch.trim()) {
      query = query.ilike('name', `%${exerciseSearch.trim()}%`);
    }
    query = query.range(exercisePage * EXERCISE_PAGE_SIZE, (exercisePage + 1) * EXERCISE_PAGE_SIZE - 1);
    const { data: all, count } = await query;
    setAllExercises((all as Exercise[]) || []);
    setExerciseTotal(count ?? 0);
  }, [exerciseSearch, exercisePage]);

  const loadChannels = useCallback(async () => {
    const { data } = await supabase.from('channels').select('*').order('created_at');
    if (data) setCommunityChannels(data as CommunityChannel[]);
  }, []);

  useEffect(() => { loadData(); loadAnnouncements(); loadChannels(); }, [loadData, loadAnnouncements, loadChannels]);
  useEffect(() => { loadExercises(); }, [loadExercises]);

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

  // Announcement handlers
  const handlePublishAnnouncement = async () => {
    if (!announcementText.trim() || !user) return;
    // Deactivate existing
    await supabase.from('announcements').update({ is_active: false } as any).eq('is_active', true);
    // Insert new
    await supabase.from('announcements').insert({ content: announcementText.trim(), is_active: true, created_by: user.id } as any);
    toast({ title: 'Announcement published' });
    setAnnouncementText('');
    loadAnnouncements();
  };

  const handleRemoveAnnouncement = async () => {
    if (!activeAnnouncement) return;
    await supabase.from('announcements').update({ is_active: false } as any).eq('id', activeAnnouncement.id);
    toast({ title: 'Announcement removed' });
    setActiveAnnouncement(null);
    setEditingAnnouncement(false);
  };

  const handleEditAnnouncement = async () => {
    if (!activeAnnouncement || !editAnnouncementText.trim()) return;
    await supabase.from('announcements').update({ content: editAnnouncementText.trim() } as any).eq('id', activeAnnouncement.id);
    toast({ title: 'Announcement updated' });
    setEditingAnnouncement(false);
    loadAnnouncements();
  };

  // Exercise handlers
  const handleApproveExercise = async (id: string) => {
    await supabase.from('exercises').update({ approved: true } as any).eq('id', id);
    toast({ title: 'Exercise approved' });
    loadExercises();
  };

  const handleRejectExercise = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id);
    toast({ title: 'Exercise removed' });
    loadExercises();
  };

  const handleDeleteCustomExercise = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id);
    toast({ title: 'Exercise deleted' });
    loadExercises();
  };

  const totalPages = Math.ceil(exerciseTotal / EXERCISE_PAGE_SIZE);

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

      <div className="px-4 lg:grid lg:grid-cols-2 lg:gap-6">
        {/* LEFT COLUMN — Content Library */}
        <div>
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
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>YouTube URL or link</label>
                <Input value={url} onChange={e => setUrl(e.target.value)} onBlur={() => autoFillFromYouTube(url)} placeholder="https://youtube.com/watch?v=..." className="h-9 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
              </div>
              {thumbnailUrl && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                  <img src={thumbnailUrl} alt="" className="w-full h-32 object-cover" />
                  <div className="p-2"><p className="text-[11px] font-semibold" style={{ color: 'hsl(var(--text))' }}>{title}</p></div>
                </div>
              )}
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
              </div>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-md px-3 py-2 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))', border: '1px solid', color: 'hsl(var(--text))' }} />
              </div>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider block mb-1.5" style={{ color: 'hsl(var(--dim))' }}>Content Type</label>
                <div className="flex gap-1.5 flex-wrap">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setContentType(t)} className="px-3 py-1 rounded-full font-mono text-[9px] uppercase" style={{ background: contentType === t ? 'hsl(var(--primary))' : 'hsl(var(--bg3))', color: contentType === t ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))', fontWeight: contentType === t ? 700 : 500 }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider block mb-1.5" style={{ color: 'hsl(var(--dim))' }}>Source</label>
                <div className="flex gap-1.5">
                  {SOURCES.map(s => (
                    <button key={s} onClick={() => setSource(s)} className="px-3 py-1 rounded-full font-mono text-[9px] uppercase" style={{ background: source === s ? 'hsl(var(--primary))' : 'hsl(var(--bg3))', color: source === s ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))', fontWeight: source === s ? 700 : 500 }}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>Tags (comma separated)</label>
                <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="strength, mobility, mindset" className="h-9 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
              </div>
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
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-[10px]" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--bg3))' }}>
                    <span className="text-[10px]">
                      {item.content_type === 'video' ? '▶' : item.content_type === 'podcast' ? '🎧' : item.content_type === 'newsletter' ? '📧' : '📄'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'hsl(var(--text))' }}>{item.title}</p>
                    <div className="flex gap-2 items-center">
                      <span className="font-mono text-[8px] uppercase" style={{ color: 'hsl(var(--dim))' }}>{item.content_type}</span>
                      {item.duration && <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>{item.duration}</span>}
                      {item.is_new_drop && <span className="font-mono text-[7px] px-1 rounded" style={{ background: 'hsl(var(--bad))', color: 'white' }}>NEW</span>}
                    </div>
                  </div>
                  <button onClick={() => handleToggleFeature(item.id, !!item.is_new_drop)} className="font-mono text-[7px] px-2 py-0.5 rounded shrink-0" style={{ background: item.is_new_drop ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--bg3))', color: item.is_new_drop ? 'hsl(var(--primary))' : 'hsl(var(--dim))' }}>
                    {item.is_new_drop ? 'FEATURED' : 'FEATURE'}
                  </button>
                  <button onClick={() => setSendItem(item)} className="p-1.5 rounded" style={{ color: 'hsl(var(--primary))' }}><Send size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded" style={{ color: 'hsl(var(--bad))' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Announcements + Exercise Library */}
        <div className="mt-6 lg:mt-0 space-y-6">

          {/* ANNOUNCEMENTS */}
          <div>
            <h2 className="font-display text-[24px] tracking-wide mb-0.5" style={{ color: 'hsl(var(--text))' }}>ANNOUNCEMENTS</h2>
            <p className="text-[11px] mb-4" style={{ color: 'hsl(var(--dim))' }}>Pinned to top of every user's home</p>

            {/* Active banner */}
            {activeAnnouncement ? (
              <div className="rounded-[10px] p-[14px] mb-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--ok)/0.3)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: 'hsl(var(--dim))' }}>ACTIVE BANNER</span>
                  <span className="font-mono text-[8px] px-2 py-0.5 rounded font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))', border: '1px solid hsl(var(--ok)/0.2)' }}>LIVE</span>
                </div>
                {editingAnnouncement ? (
                  <div className="space-y-2">
                    <textarea
                      value={editAnnouncementText}
                      onChange={e => setEditAnnouncementText(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 text-xs"
                      style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))' }}
                    />
                    <div className="flex gap-2">
                      <button onClick={handleEditAnnouncement} className="flex-1 py-1.5 rounded-lg font-mono text-[9px] font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>Save</button>
                      <button onClick={() => setEditingAnnouncement(false)} className="flex-1 py-1.5 rounded-lg font-mono text-[9px]" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'hsl(var(--text))' }}>{activeAnnouncement.content}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setEditingAnnouncement(true); setEditAnnouncementText(activeAnnouncement.content); }} className="flex-1 py-1.5 rounded-lg font-mono text-[9px] border" style={{ borderColor: 'hsl(var(--primary)/0.3)', color: 'hsl(var(--primary))' }}>Edit</button>
                      <button onClick={handleRemoveAnnouncement} className="flex-1 py-1.5 rounded-lg font-mono text-[9px] border" style={{ borderColor: 'hsl(var(--bad)/0.3)', color: 'hsl(var(--bad))' }}>Remove</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-[10px] p-4 mb-4 text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                <p className="text-[11px]" style={{ color: 'hsl(var(--dim))' }}>No active banner</p>
              </div>
            )}

            {/* New announcement form */}
            <div className="space-y-2">
              <textarea
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Write your announcement..."
                rows={3}
                className="w-full rounded-lg px-[10px] py-[10px] text-[12px] min-h-[80px]"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))' }}
              />
              <Button onClick={handlePublishAnnouncement} disabled={!announcementText.trim()} className="w-full font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
                Publish Announcement
              </Button>
            </div>
          </div>

          {/* EXERCISE LIBRARY ADMIN */}
          <div>
            <h2 className="font-display text-[20px] tracking-wide mb-0.5" style={{ color: 'hsl(var(--text))' }}>EXERCISE LIBRARY</h2>
            <p className="text-[11px] mb-4" style={{ color: 'hsl(var(--dim))' }}>Manage exercises + pending submissions</p>

            {/* Pending review */}
            <div className="mb-4">
              <p className="font-mono text-[9px] uppercase tracking-[2px] mb-2" style={{ color: 'hsl(var(--warn))' }}>
                PENDING REVIEW ({pendingExercises.length})
              </p>
              {pendingExercises.length === 0 ? (
                <div className="rounded-lg p-3 text-center" style={{ background: 'hsla(38,92%,50%,0.04)', border: '1px solid hsl(var(--warn)/0.2)' }}>
                  <p className="text-[10px]" style={{ color: 'hsl(var(--dim))' }}>No pending submissions</p>
                </div>
              ) : (
                <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsla(38,92%,50%,0.04)', border: '1px solid hsl(var(--warn)/0.2)' }}>
                  {pendingExercises.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between gap-2">
                      <span className="text-[12px] truncate" style={{ color: 'hsl(var(--text))' }}>{ex.name}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => handleApproveExercise(ex.id)} className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))', border: '1px solid hsl(var(--ok)/0.2)' }}>✓ Approve</button>
                        <button onClick={() => handleRejectExercise(ex.id)} className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: 'hsl(var(--bad)/0.1)', color: 'hsl(var(--bad))', border: '1px solid hsl(var(--bad)/0.2)' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All exercises */}
            <div className="mb-2 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--dim))' }} />
              <Input
                value={exerciseSearch}
                onChange={e => { setExerciseSearch(e.target.value); setExercisePage(0); }}
                placeholder="Search exercises..."
                className="h-9 text-xs pl-9"
                style={{ background: 'hsl(var(--bg2))', borderColor: 'hsl(var(--border2))' }}
              />
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] mb-2" style={{ color: 'hsl(var(--dim))' }}>
              {exerciseTotal} exercises in library
            </p>

            <div className="space-y-1.5">
              {allExercises.map(ex => (
                <div key={ex.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                  {/* Movement pattern pip */}
                  <div className="w-[3px] h-6 rounded-full shrink-0" style={{ background: 'hsl(var(--primary))' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'hsl(var(--text))' }}>{ex.name}</p>
                  </div>
                  {ex.movement_pattern && (
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'hsl(var(--pg))', color: 'hsl(var(--primary))' }}>{ex.movement_pattern}</span>
                  )}
                  <span className="font-mono text-[9px] shrink-0" style={{ color: 'hsl(var(--dim))' }}>×{ex.difficulty_coefficient ?? 1.0}</span>
                  {ex.is_custom && (
                    <button onClick={() => handleDeleteCustomExercise(ex.id)} className="p-1 rounded shrink-0" style={{ color: 'hsl(var(--bad))' }}><Trash2 size={12} /></button>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <button disabled={exercisePage === 0} onClick={() => setExercisePage(p => p - 1)} className="font-mono text-[9px] px-3 py-1 rounded disabled:opacity-30" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>← Prev</button>
                <span className="font-mono text-[9px]" style={{ color: 'hsl(var(--dim))' }}>{exercisePage + 1}/{totalPages}</span>
                <button disabled={exercisePage >= totalPages - 1} onClick={() => setExercisePage(p => p + 1)} className="font-mono text-[9px] px-3 py-1 rounded disabled:opacity-30" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>Next →</button>
              </div>
            )}
          </div>

          {/* COMMUNITY CHANNELS */}
          <div>
            <h2 className="font-display text-[20px] tracking-wide mb-0.5" style={{ color: 'hsl(var(--text))' }}>COMMUNITY CHANNELS</h2>
            <p className="text-[11px] mb-4" style={{ color: 'hsl(var(--dim))' }}>Manage community chat channels</p>

            <div className="space-y-1.5 mb-4">
              {communityChannels.map(ch => (
                <div key={ch.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: channelColorMap[ch.color || 'primary'] || channelColorMap.primary }} />
                  {editingChannelId === ch.id ? (
                    <div className="flex-1 flex gap-1.5">
                      <Input value={editChannelName} onChange={e => setEditChannelName(e.target.value)} className="h-7 text-xs flex-1" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
                      <button onClick={async () => {
                        if (!editChannelName.trim()) return;
                        await supabase.from('channels').update({ name: editChannelName.trim() } as any).eq('id', ch.id);
                        setCommunityChannels(prev => prev.map(c => c.id === ch.id ? { ...c, name: editChannelName.trim() } : c));
                        setEditingChannelId(null);
                        toast({ title: 'Channel renamed' });
                      }} className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: 'hsl(var(--ok)/0.1)', color: 'hsl(var(--ok))' }}>Save</button>
                      <button onClick={() => setEditingChannelId(null)} className="px-2 py-1 rounded text-[9px]" style={{ color: 'hsl(var(--dim))' }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: 'hsl(var(--text))' }}>{ch.name}</span>
                      <button onClick={() => { setEditingChannelId(ch.id); setEditChannelName(ch.name); }} className="font-mono text-[8px] px-2 py-0.5 rounded" style={{ color: 'hsl(var(--primary))' }}>Rename</button>
                      <button onClick={async () => {
                        if (!confirm(`Delete channel "${ch.name}"?`)) return;
                        await supabase.from('channels').delete().eq('id', ch.id);
                        setCommunityChannels(prev => prev.filter(c => c.id !== ch.id));
                        toast({ title: 'Channel deleted' });
                      }} className="font-mono text-[8px] px-2 py-0.5 rounded" style={{ color: 'hsl(var(--bad))' }}>Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add channel */}
            <div className="rounded-[10px] p-3 space-y-2" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
              <p className="font-mono text-[8px] uppercase tracking-wider" style={{ color: 'hsl(var(--dim))' }}>+ ADD CHANNEL</p>
              <Input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Channel name" className="h-8 text-xs" style={{ background: 'hsl(var(--bg3))', borderColor: 'hsl(var(--border2))' }} />
              <div className="flex gap-1.5">
                {Object.entries(channelColorMap).map(([key, val]) => (
                  <button key={key} onClick={() => setNewChannelColor(key)} className="w-6 h-6 rounded-full border-2" style={{
                    background: val,
                    borderColor: newChannelColor === key ? 'hsl(var(--text))' : 'transparent',
                  }} />
                ))}
              </div>
              <Button onClick={async () => {
                if (!newChannelName.trim()) { toast({ title: 'Name required' }); return; }
                const { data, error } = await supabase.from('channels').insert({ name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'), color: newChannelColor } as any).select().single();
                if (error) { toast({ title: 'Error', description: error.message }); return; }
                if (data) setCommunityChannels(prev => [...prev, data as any]);
                setNewChannelName('');
                toast({ title: 'Channel created' });
              }} className="w-full font-bold h-8 text-xs" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
                Create Channel
              </Button>
            </div>
          </div>

          {/* AI KNOWLEDGE BASE */}
          <AIKnowledgeBaseSection userId={user?.id} />
        </div>
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
