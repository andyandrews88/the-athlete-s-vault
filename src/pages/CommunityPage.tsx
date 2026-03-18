import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Send, Search, X, MessageSquare, MoreVertical, BarChart3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_message_id: string | null;
  is_pinned: boolean;
  sender_name?: string;
  reply_count?: number;
}

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface Poll {
  id: string;
  channel_id: string;
  question: string;
  options: string[];
  message_id: string | null;
  created_at: string;
}

interface PollVote {
  poll_id: string;
  option_index: number;
  user_id: string;
}

const COLOR_MAP: Record<string, string> = {
  primary: 'hsl(192,91%,54%)',
  ok: 'hsl(142,71%,45%)',
  gold: 'hsl(45,93%,58%)',
  warn: 'hsl(38,92%,50%)',
  purple: 'hsl(262,60%,55%)',
  bad: 'hsl(0,72%,51%)',
};

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '💪', '🏆', '😂', '👏', '✅'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');

const CommunityPage = () => {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = profile?.role === 'admin';

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [input, setInput] = useState('');
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Thread state
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState('');

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Message & { channel_name?: string })[]>([]);
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  // Poll state
  const [pollSheetOpen, setPollSheetOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);

  // Fetch channels
  useEffect(() => {
    supabase.from('channels').select('*').order('created_at').then(({ data }) => {
      if (data && data.length > 0) {
        setChannels(data as Channel[]);
        setActiveChannelId(data[0].id);
      }
    });
  }, []);

  // Fetch messages for active channel (only top-level)
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    const { data } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', activeChannelId)
      .is('parent_message_id', null)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name || 'User'; });

      // Get reply counts
      const msgIds = data.map((m: any) => m.id);
      const { data: replies } = await supabase
        .from('channel_messages')
        .select('parent_message_id')
        .in('parent_message_id', msgIds);

      const replyCounts: Record<string, number> = {};
      replies?.forEach((r: any) => {
        replyCounts[r.parent_message_id] = (replyCounts[r.parent_message_id] || 0) + 1;
      });

      setMessages(data.map((m: any) => ({
        ...m,
        sender_name: nameMap[m.user_id] || 'User',
        reply_count: replyCounts[m.id] || 0,
      })));
    }
  }, [activeChannelId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Fetch reactions
  useEffect(() => {
    if (messages.length === 0) { setReactions({}); return; }
    const msgIds = messages.map(m => m.id);
    supabase.from('message_reactions').select('*').in('message_id', msgIds).then(({ data }) => {
      if (!data) return;
      const map: Record<string, Reaction[]> = {};
      data.forEach((r: any) => {
        if (!map[r.message_id]) map[r.message_id] = [];
        const existing = map[r.message_id].find(x => x.emoji === r.emoji);
        if (existing) { existing.count++; if (r.user_id === user?.id) existing.reacted = true; }
        else map[r.message_id].push({ emoji: r.emoji, count: 1, reacted: r.user_id === user?.id });
      });
      setReactions(map);
    });
  }, [messages, user?.id]);

  // Fetch polls for active channel
  useEffect(() => {
    if (!activeChannelId) return;
    supabase.from('polls').select('*').eq('channel_id', activeChannelId).then(({ data }) => {
      if (data) setPolls(data.map((p: any) => ({ ...p, options: p.options as string[] })));
    });
  }, [activeChannelId]);

  // Fetch poll votes
  useEffect(() => {
    if (polls.length === 0) { setPollVotes([]); return; }
    const pollIds = polls.map(p => p.id);
    supabase.from('poll_votes').select('*').in('poll_id', pollIds).then(({ data }) => {
      if (data) setPollVotes(data as PollVote[]);
    });
  }, [polls]);

  // Realtime subscription
  useEffect(() => {
    if (!activeChannelId) return;
    const channel = supabase
      .channel(`community-${activeChannelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_messages',
        filter: `channel_id=eq.${activeChannelId}`,
      }, async (payload) => {
        const msg = payload.new as any;
        if (msg.parent_message_id) {
          // Thread reply - update reply count
          if (msg.parent_message_id === threadMsgId) {
            const { data: p } = await supabase.from('profiles').select('full_name').eq('id', msg.user_id).single();
            msg.sender_name = p?.full_name || 'User';
            setThreadReplies(prev => [...prev, msg]);
          }
          setMessages(prev => prev.map(m =>
            m.id === msg.parent_message_id ? { ...m, reply_count: (m.reply_count || 0) + 1 } : m
          ));
          return;
        }
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', msg.user_id).single();
        msg.sender_name = p?.full_name || 'User';
        msg.reply_count = 0;
        setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannelId, threadMsgId]);

  // Auto-scroll
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannelId || !user) return;
    await supabase.from('channel_messages').insert({
      channel_id: activeChannelId,
      user_id: user.id,
      content: input.trim(),
    } as any);
    setInput('');
  };

  const sendThreadReply = async () => {
    if (!threadInput.trim() || !activeChannelId || !user || !threadMsgId) return;
    await supabase.from('channel_messages').insert({
      channel_id: activeChannelId,
      user_id: user.id,
      content: threadInput.trim(),
      parent_message_id: threadMsgId,
    } as any);
    setThreadInput('');
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msgReactions = reactions[messageId] || [];
    const existing = msgReactions.find(r => r.emoji === emoji && r.reacted);
    if (existing) {
      await supabase.from('message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji } as any);
    }
    // Refetch
    const allMsgIds = messages.map(m => m.id);
    const { data } = await supabase.from('message_reactions').select('*').in('message_id', allMsgIds);
    if (data) {
      const map: Record<string, Reaction[]> = {};
      data.forEach((r: any) => {
        if (!map[r.message_id]) map[r.message_id] = [];
        const ex = map[r.message_id].find(x => x.emoji === r.emoji);
        if (ex) { ex.count++; if (r.user_id === user.id) ex.reacted = true; }
        else map[r.message_id].push({ emoji: r.emoji, count: 1, reacted: r.user_id === user.id });
      });
      setReactions(map);
    }
    setEmojiPickerMsgId(null);
  };

  // Thread
  const openThread = async (msgId: string) => {
    setThreadMsgId(msgId);
    const { data } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('parent_message_id', msgId)
      .order('created_at', { ascending: true });
    if (data) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name || 'User'; });
      setThreadReplies(data.map((m: any) => ({ ...m, sender_name: nameMap[m.user_id] || 'User' })));
    }
  };

  // Pin
  const pinMessage = async (msgId: string) => {
    await supabase.from('channel_messages').update({ is_pinned: true } as any).eq('id', msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: true } : m));
    setMenuMsgId(null);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from('channel_messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setMenuMsgId(null);
  };

  // Search
  const runSearch = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    let q = supabase
      .from('channel_messages')
      .select('*')
      .ilike('content', `%${query.trim()}%`)
      .is('parent_message_id', null)
      .order('created_at', { ascending: false })
      .limit(50);
    if (searchFilter) {
      const ch = channels.find(c => c.name === searchFilter);
      if (ch) q = q.eq('channel_id', ch.id);
    }
    const { data } = await q;
    if (data) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name || 'User'; });
      setSearchResults(data.map((m: any) => ({
        ...m,
        sender_name: nameMap[m.user_id] || 'User',
        channel_name: channels.find(c => c.id === m.channel_id)?.name || 'unknown',
      })));
    }
  };

  // Poll
  const createPoll = async () => {
    if (!pollQuestion.trim() || !activeChannelId || !user) return;
    const opts = pollOptions.filter(o => o.trim());
    if (opts.length < 2) return;
    // Insert a message for the poll
    const { data: msg } = await supabase.from('channel_messages').insert({
      channel_id: activeChannelId,
      user_id: user.id,
      content: `📊 Poll: ${pollQuestion.trim()}`,
    } as any).select().single();
    if (msg) {
      await supabase.from('polls').insert({
        channel_id: activeChannelId,
        created_by: user.id,
        question: pollQuestion.trim(),
        options: opts,
        message_id: (msg as any).id,
      } as any);
    }
    setPollSheetOpen(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    // Refresh polls
    const { data: pollData } = await supabase.from('polls').select('*').eq('channel_id', activeChannelId);
    if (pollData) setPolls(pollData.map((p: any) => ({ ...p, options: p.options as string[] })));
  };

  const votePoll = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    const existing = pollVotes.find(v => v.poll_id === pollId && v.user_id === user.id);
    if (existing) {
      await supabase.from('poll_votes').update({ option_index: optionIndex } as any)
        .eq('poll_id', pollId).eq('user_id', user.id);
    } else {
      await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex } as any);
    }
    // Refresh votes
    const pollIds = polls.map(p => p.id);
    const { data } = await supabase.from('poll_votes').select('*').in('poll_id', pollIds);
    if (data) setPollVotes(data as PollVote[]);
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const threadParent = messages.find(m => m.id === threadMsgId);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    let h = d.getHours(); const m = d.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')}${ampm}`;
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getPollForMessage = (msgId: string) => polls.find(p => p.message_id === msgId);

  const renderMessage = (msg: Message, isThread = false) => {
    const poll = getPollForMessage(msg.id);
    const pollTotalVotes = poll ? pollVotes.filter(v => v.poll_id === poll.id).length : 0;
    const userVote = poll ? pollVotes.find(v => v.poll_id === poll.id && v.user_id === user?.id) : null;

    return (
      <div
        key={msg.id}
        style={{ display: 'flex', gap: 8, padding: '6px 14px', position: 'relative' }}
        onMouseEnter={e => { (e.currentTarget.style.background = 'hsl(220,16%,12%)'); }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); setMenuMsgId(null); }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700,
          color: 'hsl(192,91%,54%)',
        }}>
          {getInitials(msg.sender_name || 'U')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>{msg.sender_name}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)' }}>{formatTime(msg.created_at)}</span>
          </div>

          {/* Poll card */}
          {poll ? (
            <div style={{ marginTop: 6, padding: 12, borderRadius: 10, background: 'hsl(220,16%,9%)', border: '1px solid hsl(215,14%,16%)' }}>
              <p style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'hsl(210,20%,95%)', marginBottom: 8 }}>{poll.question}</p>
              {poll.options.map((opt, i) => {
                const optVotes = pollVotes.filter(v => v.poll_id === poll.id && v.option_index === i).length;
                const pct = pollTotalVotes > 0 ? (optVotes / pollTotalVotes) * 100 : 0;
                const voted = userVote?.option_index === i;
                return (
                  <button
                    key={i}
                    onClick={() => votePoll(poll.id, i)}
                    style={{
                      width: '100%', textAlign: 'left', marginBottom: 4,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: 'hsl(220,16%,12%)', border: `1px solid ${voted ? 'hsl(192,91%,54%)' : 'hsl(215,14%,16%)'}`,
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${pct}%`, background: 'hsla(192,91%,54%,0.15)',
                      transition: 'width 0.3s',
                    }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: 'hsl(210,20%,95%)' }}>{opt}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(215,14%,50%)' }}>{optVotes}</span>
                    </div>
                  </button>
                );
              })}
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)', marginTop: 4 }}>{pollTotalVotes} votes</p>
            </div>
          ) : (
            <div style={{ fontFamily: 'Inter', fontSize: 12, color: 'hsl(210,15%,70%)', lineHeight: 1.5 }}>{msg.content}</div>
          )}

          {/* Thread indicator */}
          {!isThread && (msg.reply_count || 0) > 0 && (
            <button
              onClick={() => openThread(msg.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'hsl(192,91%,54%)', fontFamily: 'JetBrains Mono', fontSize: 9,
              }}
            >
              <MessageSquare size={12} />
              {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Reactions */}
          {!isThread && (
            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              {(reactions[msg.id] || []).map(r => (
                <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)} style={{
                  background: r.reacted ? 'hsla(192,91%,54%,0.1)' : 'hsl(220,16%,12%)',
                  border: `1px solid ${r.reacted ? 'hsla(192,91%,54%,0.3)' : 'hsl(215,14%,16%)'}`,
                  borderRadius: 10, padding: '2px 6px', fontSize: 10, cursor: 'pointer',
                  color: 'hsl(210,20%,95%)', display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  {r.emoji} <span style={{ fontFamily: 'JetBrains Mono' }}>{r.count}</span>
                </button>
              ))}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} style={{
                  background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,16%)',
                  borderRadius: 10, padding: '2px 6px', fontSize: 10, cursor: 'pointer', color: 'hsl(215,14%,50%)',
                }}>+</button>
                {emojiPickerMsgId === msg.id && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0,
                    background: 'hsl(220,16%,9%)', border: '1px solid hsl(215,14%,22%)',
                    borderRadius: 8, padding: 6, display: 'flex', gap: 4, zIndex: 10, flexWrap: 'wrap', width: 160,
                  }}>
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} onClick={() => toggleReaction(msg.id, e)} style={{
                        background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 4, borderRadius: 4,
                      }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin menu */}
        {isAdmin && !isThread && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215,14%,50%)', padding: 2,
            }}>
              <MoreVertical size={14} />
            </button>
            {menuMsgId === msg.id && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 20,
                background: 'hsl(220,16%,9%)', border: '1px solid hsl(215,14%,22%)',
                borderRadius: 8, overflow: 'hidden', minWidth: 140,
              }}>
                <button onClick={() => pinMessage(msg.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(210,20%,95%)',
                  fontFamily: 'Inter', fontSize: 11,
                }}>📌 Pin message</button>
                <button onClick={() => deleteMessage(msg.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(0,72%,51%)',
                  fontFamily: 'Inter', fontSize: 11,
                }}>🗑 Delete message</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Channel sidebar
  const channelList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 6px' }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'hsl(215,14%,50%)', padding: '5px 7px' }}>CHANNELS</span>
      {channels.map(ch => {
        const isActive = ch.id === activeChannelId;
        return (
          <button
            key={ch.id}
            onClick={() => setActiveChannelId(ch.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 7px', borderRadius: 6, cursor: 'pointer',
              background: isActive ? 'hsla(192,91%,54%,0.08)' : 'transparent',
              border: 'none', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: COLOR_MAP[ch.color || 'primary'] || COLOR_MAP.primary,
            }} />
            <span style={{
              fontSize: 11, fontFamily: 'Inter',
              color: isActive ? 'hsl(210,20%,95%)' : 'hsl(215,14%,50%)',
              lineHeight: 1.3,
            }}>
              {capitalize(ch.name)}
            </span>
          </button>
        );
      })}
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'hsl(215,14%,50%)', padding: '5px 7px', marginTop: 4 }}>DMs</span>
      <button style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 7px', borderRadius: 6, cursor: 'pointer',
        background: 'transparent', border: 'none', textAlign: 'left', width: '100%',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: COLOR_MAP.gold }} />
        <span style={{ fontSize: 11, fontFamily: 'Inter', color: 'hsl(45,93%,58%)' }}>Andy</span>
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Channels sidebar */}
      <div style={{
        width: isMobile ? 100 : 200, flexShrink: 0,
        background: 'hsl(220,16%,9%)', borderRight: '1px solid hsl(215,14%,16%)',
        overflowY: 'auto',
      }}>
        {channelList}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Channel header */}
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid hsl(215,14%,16%)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {searchOpen ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); runSearch(e.target.value); }}
                placeholder="Search messages..."
                style={{
                  flex: 1, background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
                  borderRadius: 8, padding: '6px 10px', fontFamily: 'Inter', fontSize: 12,
                  color: 'hsl(210,20%,95%)', outline: 'none',
                }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); setSearchFilter(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215,14%,50%)' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'hsl(210,20%,95%)', flex: 1 }}>
                {capitalize(activeChannel?.name || 'general')}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(215,14%,50%)' }}>24 members</span>
              <button onClick={() => setSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215,14%,50%)' }}>
                <Search size={16} />
              </button>
            </>
          )}
        </div>

        {/* Search filter pills */}
        {searchOpen && (
          <div style={{ display: 'flex', gap: 4, padding: '6px 14px', flexWrap: 'wrap', borderBottom: '1px solid hsl(215,14%,16%)' }}>
            {[null, ...channels.map(c => c.name)].map(f => (
              <button
                key={f || 'all'}
                onClick={() => { setSearchFilter(f); runSearch(searchQuery); }}
                style={{
                  padding: '3px 8px', borderRadius: 10, fontSize: 9, fontFamily: 'JetBrains Mono',
                  cursor: 'pointer', border: 'none',
                  background: searchFilter === f ? 'hsl(192,91%,54%)' : 'hsl(220,16%,12%)',
                  color: searchFilter === f ? 'hsl(220,16%,6%)' : 'hsl(215,14%,50%)',
                }}
              >
                {f ? capitalize(f) : 'All'}
              </button>
            ))}
          </div>
        )}

        {/* Search results */}
        {searchOpen && searchQuery.trim() && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
            {searchResults.length === 0 ? (
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'hsl(215,14%,50%)', textAlign: 'center', paddingTop: 20 }}>No results</p>
            ) : (
              (() => {
                const grouped: Record<string, typeof searchResults> = {};
                searchResults.forEach(r => {
                  const cn = r.channel_name || 'unknown';
                  if (!grouped[cn]) grouped[cn] = [];
                  grouped[cn].push(r);
                });
                return Object.entries(grouped).map(([chName, results]) => (
                  <div key={chName} style={{ marginBottom: 12 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)', textTransform: 'uppercase' }}>{chName}</span>
                    {results.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          const ch = channels.find(c => c.name === chName);
                          if (ch) setActiveChannelId(ch.id);
                          setSearchOpen(false); setSearchQuery(''); setSearchResults([]); setSearchFilter(null);
                        }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px',
                          borderRadius: 6, cursor: 'pointer', background: 'transparent', border: 'none', marginTop: 2,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>{r.sender_name}</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)' }}>{formatTime(r.created_at)}</span>
                        </div>
                        <p style={{ fontFamily: 'Inter', fontSize: 11, color: 'hsl(210,15%,70%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.content}
                        </p>
                      </button>
                    ))}
                  </div>
                ));
              })()
            )}
          </div>
        )}

        {/* Messages (hidden when search results showing) */}
        {!(searchOpen && searchQuery.trim()) && (
          <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Pinned messages */}
            {pinnedMessages.length > 0 && (
              <div style={{ padding: '8px 14px' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)' }}>PINNED</span>
                {pinnedMessages.map(pm => (
                  <div key={pm.id} style={{
                    background: 'hsl(220,16%,12%)', borderLeft: '3px solid hsl(192,91%,54%)',
                    padding: '8px 12px', borderRadius: 6, marginTop: 4,
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                  }}>
                    <span style={{ fontSize: 12 }}>📌</span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>{pm.sender_name}</span>
                      <p style={{ fontFamily: 'Inter', fontSize: 11, color: 'hsl(210,15%,70%)', marginTop: 2 }}>{pm.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {messages.map(msg => renderMessage(msg))}
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'JetBrains Mono', fontSize: 10, color: 'hsl(215,14%,50%)' }}>
                No messages yet. Say something!
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{
          background: 'hsla(220,16%,8%,0.97)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid hsl(215,14%,16%)', padding: '10px 14px',
          display: 'flex', gap: 8,
        }}>
          {isAdmin && (
            <button onClick={() => setPollSheetOpen(true)} style={{
              background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
              borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'hsl(215,14%,50%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={16} />
            </button>
          )}
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Message ${capitalize(activeChannel?.name || 'general')}`}
            style={{
              flex: 1, background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
              borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13,
              color: 'hsl(210,20%,95%)', outline: 'none',
            }}
          />
          <button onClick={sendMessage} style={{
            background: 'hsl(192,91%,54%)', color: 'hsl(220,16%,6%)',
            borderRadius: 8, padding: '8px 12px', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Thread Panel */}
      {threadMsgId && (
        <div style={{
          width: isMobile ? '100%' : 340, flexShrink: 0,
          position: isMobile ? 'fixed' : 'relative',
          top: 0, right: 0, bottom: 0, zIndex: isMobile ? 50 : 1,
          background: 'hsl(220,16%,6%)', borderLeft: '1px solid hsl(215,14%,16%)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid hsl(215,14%,16%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>Thread</span>
            <button onClick={() => { setThreadMsgId(null); setThreadReplies([]); }} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215,14%,50%)',
            }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Original message */}
            {threadParent && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid hsl(215,14%,16%)', opacity: 0.8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700, color: 'hsl(192,91%,54%)',
                  }}>
                    {getInitials(threadParent.sender_name || 'U')}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>{threadParent.sender_name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)' }}>{formatTime(threadParent.created_at)}</span>
                    </div>
                    <p style={{ fontFamily: 'Inter', fontSize: 12, color: 'hsl(210,15%,70%)', lineHeight: 1.5 }}>{threadParent.content}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Replies */}
            {threadReplies.map(r => renderMessage(r, true))}
          </div>

          {/* Reply input */}
          <div style={{
            borderTop: '1px solid hsl(215,14%,16%)', padding: '10px 14px',
            display: 'flex', gap: 8,
          }}>
            <input
              value={threadInput}
              onChange={e => setThreadInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendThreadReply(); } }}
              placeholder="Reply in thread..."
              style={{
                flex: 1, background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
                borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13,
                color: 'hsl(210,20%,95%)', outline: 'none',
              }}
            />
            <button onClick={sendThreadReply} style={{
              background: 'hsl(192,91%,54%)', color: 'hsl(220,16%,6%)',
              borderRadius: 8, padding: '8px 12px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Poll Creator Sheet */}
      <Sheet open={pollSheetOpen} onOpenChange={setPollSheetOpen}>
        <SheetContent side="bottom" className="p-4" style={{ background: 'hsl(220,16%,6%)', border: 'none' }}>
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-display text-lg" style={{ color: 'hsl(210,20%,95%)' }}>CREATE POLL</SheetTitle>
          </SheetHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              placeholder="Ask your community..."
              style={{
                background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
                borderRadius: 8, padding: '10px 12px', fontFamily: 'Inter', fontSize: 13,
                color: 'hsl(210,20%,95%)', outline: 'none',
              }}
            />
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={e => { const copy = [...pollOptions]; copy[i] = e.target.value; setPollOptions(copy); }}
                placeholder={`Option ${i + 1}`}
                style={{
                  background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,22%)',
                  borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter', fontSize: 12,
                  color: 'hsl(210,20%,95%)', outline: 'none',
                }}
              />
            ))}
            {pollOptions.length < 4 && (
              <button onClick={() => setPollOptions([...pollOptions, ''])} style={{
                background: 'none', border: '1px dashed hsl(215,14%,22%)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                fontFamily: 'JetBrains Mono', fontSize: 10, color: 'hsl(215,14%,50%)',
              }}>
                + Add option
              </button>
            )}
            <button onClick={createPoll} style={{
              background: 'hsl(192,91%,54%)', color: 'hsl(220,16%,6%)',
              borderRadius: 8, padding: '10px 14px', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
            }}>
              Post Poll
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CommunityPage;
