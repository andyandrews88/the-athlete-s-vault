import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Bookmark, Play, FileText, Headphones, Mail, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const typeIcons: Record<string, React.ReactNode> = {
  video: <Play size={14} />,
  podcast: <Headphones size={14} />,
  article: <FileText size={14} />,
  pdf: <FileText size={14} />,
  newsletter: <span className="text-xs">📧</span>,
};

const FILTERS = ['All', 'Videos', 'Podcasts', 'Articles', 'PDFs', 'Newsletters', 'Saved'] as const;
type Filter = typeof FILTERS[number];

const filterToType: Record<string, string> = {
  Videos: 'video',
  Podcasts: 'podcast',
  Articles: 'article',
  PDFs: 'pdf',
  Newsletters: 'newsletter',
};

const LibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [viewerItem, setViewerItem] = useState<ContentItem | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [{ data: items }, { data: bm }] = await Promise.all([
      supabase.from('content_items').select('*').order('created_at', { ascending: false }),
      supabase.from('bookmarks').select('content_id').eq('user_id', user.id),
    ]);
    setContent((items as ContentItem[]) || []);
    setBookmarkIds(new Set((bm || []).map((b: any) => b.content_id)));
    setLoading(false);
    localStorage.setItem('last_library_visit', new Date().toISOString());
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const lastVisit = localStorage.getItem('last_library_visit');

  const toggleBookmark = async (contentId: string) => {
    if (!user) return;
    const saved = bookmarkIds.has(contentId);
    // Optimistic
    setBookmarkIds(prev => {
      const next = new Set(prev);
      saved ? next.delete(contentId) : next.add(contentId);
      return next;
    });
    if (saved) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('content_id', contentId);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, content_id: contentId });
    }
  };

  const filtered = content.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !(c.tags || []).some(t => t.toLowerCase().includes(q))) return false;
    }
    if (filter === 'Saved') return bookmarkIds.has(c.id);
    if (filter !== 'All' && c.content_type !== filterToType[filter]) return false;
    return true;
  });

  const newDrops = content.filter(c => c.is_new_drop);
  const isNew = (c: ContentItem) => lastVisit && c.created_at && new Date(c.created_at) > new Date(lastVisit);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'hsl(var(--bg))' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: 'hsl(var(--bg))' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/home')} className="p-1">
            <ArrowLeft size={20} style={{ color: 'hsl(var(--dim))' }} />
          </button>
          <h1 className="font-display text-[28px] tracking-wide" style={{ color: 'hsl(var(--text))' }}>LIBRARY</h1>
          <span className="ml-auto font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>
            {content.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--dim))' }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search library..."
            className="pl-9 h-9 text-xs border-0"
            style={{ background: 'hsl(var(--bg2))', borderColor: 'hsl(var(--border2))', borderWidth: 1, borderRadius: 8 }}
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-wider transition-colors"
              style={{
                background: filter === f ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                color: filter === f ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                fontWeight: filter === f ? 700 : 500,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* New Drops */}
      {newDrops.length > 0 && filter === 'All' && !search && (
        <div className="px-4 mb-4">
          <p className="font-mono text-[9px] uppercase tracking-[2px] mb-2" style={{ color: 'hsl(var(--primary))' }}>NEW DROPS</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {newDrops.map(item => (
              <button
                key={item.id}
                onClick={() => setViewerItem(item)}
                className="shrink-0 w-[200px] rounded-lg overflow-hidden text-left"
                style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}
              >
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt="" className="w-full h-[112px] object-cover" />
                )}
                <div className="p-2.5">
                  <p className="text-[12px] font-semibold line-clamp-2" style={{ color: 'hsl(var(--text))' }}>{item.title}</p>
                  <p className="font-mono text-[8px] mt-1" style={{ color: 'hsl(var(--dim))' }}>{item.content_type.toUpperCase()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content grid */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: 'hsl(var(--bg2))' }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto mb-3" style={{ color: 'hsl(var(--dim))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--dim))' }}>No content found</p>
          </div>
        ) : (
          filtered.map(item => (
            <button
              key={item.id}
              onClick={() => setViewerItem(item)}
              className="w-full flex items-start gap-3 p-3 rounded-[10px] text-left relative transition-colors"
              style={{
                background: 'hsl(var(--bg2))',
                border: isNew(item) ? '1px solid hsla(192,91%,54%,0.3)' : '1px solid hsl(var(--border))',
              }}
            >
              {/* Thumbnail */}
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" className="w-16 h-16 rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center" style={{ background: 'hsl(var(--bg3))' }}>
                  {typeIcons[item.content_type] || <FileText size={20} style={{ color: 'hsl(var(--dim))' }} />}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold line-clamp-2" style={{ color: 'hsl(var(--text))' }}>{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>
                    {item.content_type}
                  </span>
                  {item.duration && (
                    <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>{item.duration}</span>
                  )}
                  {item.source && (
                    <span className="font-mono text-[8px] uppercase" style={{ color: 'hsl(var(--dim))' }}>{item.source}</span>
                  )}
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {item.tags.slice(0, 3).map(t => (
                      <span key={t} className="font-mono text-[7px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* New badge */}
              {item.is_new_drop && (
                <span className="absolute top-2 left-2 font-mono text-[7px] font-bold px-[5px] py-[2px] rounded-[3px] text-white" style={{ background: 'hsl(var(--bad))' }}>NEW</span>
              )}

              {/* Bookmark */}
              <button
                onClick={e => { e.stopPropagation(); toggleBookmark(item.id); }}
                className="shrink-0 p-1"
              >
                <Bookmark
                  size={18}
                  fill={bookmarkIds.has(item.id) ? 'hsl(var(--primary))' : 'none'}
                  style={{ color: bookmarkIds.has(item.id) ? 'hsl(var(--primary))' : 'hsl(var(--dim))' }}
                />
              </button>
            </button>
          ))
        )}
      </div>

      {/* Content Viewer Sheet */}
      <Sheet open={!!viewerItem} onOpenChange={() => setViewerItem(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-0" style={{ background: 'hsl(var(--bg))', border: 'none' }}>
          {viewerItem && (
            <div>
              {viewerItem.thumbnail_url && (
                <img src={viewerItem.thumbnail_url} alt="" className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-left text-lg font-semibold" style={{ color: 'hsl(var(--text))' }}>{viewerItem.title}</SheetTitle>
                </SheetHeader>

                <div className="flex items-center gap-2 mb-4">
                  <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>
                    {viewerItem.content_type}
                  </span>
                  {viewerItem.duration && (
                    <span className="font-mono text-[9px]" style={{ color: 'hsl(var(--dim))' }}>{viewerItem.duration}</span>
                  )}
                </div>

                {viewerItem.description && (
                  <p className="text-[13px] mb-4" style={{ color: 'hsl(var(--mid))' }}>{viewerItem.description}</p>
                )}

                {viewerItem.url && (
                  <a href={viewerItem.url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full mb-6 gap-2" style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}>
                      <ExternalLink size={14} /> Open Content
                    </Button>
                  </a>
                )}

                {/* Tags */}
                {viewerItem.tags && viewerItem.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-6">
                    {viewerItem.tags.map(t => (
                      <span key={t} className="font-mono text-[8px] px-2 py-0.5 rounded" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Post-content CTA */}
                <div className="rounded-[10px] p-[14px]" style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}>
                  <p className="text-[13px] font-semibold mb-1" style={{ color: 'hsl(var(--text))' }}>Ready to put this into practice?</p>
                  <p className="text-[12px] mb-3" style={{ color: 'hsl(var(--mid))' }}>
                    Work directly with Andy and get a programme built around your data.
                  </p>
                  <Button
                    onClick={() => { setViewerItem(null); navigate('/pricing'); }}
                    className="w-full font-bold"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)' }}
                  >
                    Explore Coaching →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LibraryPage;
