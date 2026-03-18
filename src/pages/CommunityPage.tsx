import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Send } from 'lucide-react';

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
  sender_name?: string;
}

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

const COLOR_MAP: Record<string, string> = {
  primary: 'hsl(192,91%,54%)',
  ok: 'hsl(142,71%,45%)',
  gold: 'hsl(45,93%,58%)',
  warn: 'hsl(38,92%,50%)',
  purple: 'hsl(262,60%,55%)',
};

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '💪', '🏆', '😂', '👏', '✅'];

const CommunityPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [input, setInput] = useState('');
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch channels
  useEffect(() => {
    supabase.from('channels').select('*').order('created_at').then(({ data }) => {
      if (data && data.length > 0) {
        setChannels(data);
        setActiveChannelId(data[0].id);
      }
    });
  }, []);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    const { data } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', activeChannelId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      // fetch sender names
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.id] = p.full_name || 'User'; });

      setMessages(data.map(m => ({ ...m, sender_name: nameMap[m.user_id] || 'User' })));
    }
  }, [activeChannelId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Fetch reactions for current messages
  useEffect(() => {
    if (messages.length === 0) { setReactions({}); return; }
    const msgIds = messages.map(m => m.id);
    supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', msgIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, Reaction[]> = {};
        data.forEach(r => {
          if (!map[r.message_id]) map[r.message_id] = [];
          const existing = map[r.message_id].find(x => x.emoji === r.emoji);
          if (existing) {
            existing.count++;
            if (r.user_id === user?.id) existing.reacted = true;
          } else {
            map[r.message_id].push({ emoji: r.emoji, count: 1, reacted: r.user_id === user?.id });
          }
        });
        setReactions(map);
      });
  }, [messages, user?.id]);

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
        const msg = payload.new as Message;
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', msg.user_id).single();
        msg.sender_name = p?.full_name || 'User';
        setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannelId]);

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
    });
    setInput('');
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msgReactions = reactions[messageId] || [];
    const existing = msgReactions.find(r => r.emoji === emoji && r.reacted);
    if (existing) {
      await supabase.from('message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId, user_id: user.id, emoji,
      });
    }
    // Refetch reactions
    const { data } = await supabase.from('message_reactions').select('*')
      .in('message_id', messages.map(m => m.id));
    if (data) {
      const map: Record<string, Reaction[]> = {};
      data.forEach(r => {
        if (!map[r.message_id]) map[r.message_id] = [];
        const ex = map[r.message_id].find(x => x.emoji === r.emoji);
        if (ex) { ex.count++; if (r.user_id === user.id) ex.reacted = true; }
        else map[r.message_id].push({ emoji: r.emoji, count: 1, reacted: r.user_id === user.id });
      });
      setReactions(map);
    }
    setEmojiPickerMsgId(null);
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    let h = d.getHours(); const m = d.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')}${ampm}`;
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
            {(!isMobile || true) && (
              <span style={{
                fontSize: 8, fontFamily: 'Inter',
                color: isActive ? 'hsl(210,20%,95%)' : 'hsl(215,14%,50%)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                # {ch.name}
              </span>
            )}
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
        <span style={{ fontSize: 8, fontFamily: 'Inter', color: 'hsl(45,93%,58%)' }}>Andy</span>
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Channels sidebar */}
      <div style={{
        width: isMobile ? 72 : 200,
        flexShrink: 0,
        background: 'hsl(220,16%,9%)',
        borderRight: '1px solid hsl(215,14%,16%)',
        overflowY: 'auto',
      }}>
        {channelList}
      </div>

      {/* Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Channel header */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid hsl(215,14%,16%)',
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>
            # {activeChannel?.name || 'general'}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'hsl(215,14%,50%)' }}>
            24 members
          </span>
        </div>

        {/* Messages */}
        <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: 8, padding: '6px 14px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220,16%,12%)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Avatar */}
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
                  <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: 'hsl(210,20%,95%)' }}>
                    {msg.sender_name}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'hsl(215,14%,50%)' }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: 'hsl(210,15%,70%)', lineHeight: 1.5 }}>
                  {msg.content}
                </div>

                {/* Reactions */}
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(reactions[msg.id] || []).map(r => (
                    <button
                      key={r.emoji}
                      onClick={() => toggleReaction(msg.id, r.emoji)}
                      style={{
                        background: r.reacted ? 'hsla(192,91%,54%,0.1)' : 'hsl(220,16%,12%)',
                        border: `1px solid ${r.reacted ? 'hsla(192,91%,54%,0.3)' : 'hsl(215,14%,16%)'}`,
                        borderRadius: 10, padding: '2px 6px', fontSize: 10,
                        cursor: 'pointer', color: 'hsl(210,20%,95%)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      {r.emoji} <span style={{ fontFamily: 'JetBrains Mono' }}>{r.count}</span>
                    </button>
                  ))}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                      style={{
                        background: 'hsl(220,16%,12%)', border: '1px solid hsl(215,14%,16%)',
                        borderRadius: 10, padding: '2px 6px', fontSize: 10,
                        cursor: 'pointer', color: 'hsl(215,14%,50%)',
                      }}
                    >+</button>
                    {emojiPickerMsgId === msg.id && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: 0,
                        background: 'hsl(220,16%,9%)', border: '1px solid hsl(215,14%,22%)',
                        borderRadius: 8, padding: 6, display: 'flex', gap: 4, zIndex: 10,
                        flexWrap: 'wrap', width: 160,
                      }}>
                        {EMOJI_OPTIONS.map(e => (
                          <button
                            key={e}
                            onClick={() => toggleReaction(msg.id, e)}
                            style={{
                              background: 'none', border: 'none', fontSize: 16,
                              cursor: 'pointer', padding: 4, borderRadius: 4,
                            }}
                          >{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono', fontSize: 10, color: 'hsl(215,14%,50%)',
            }}>
              No messages yet. Say something!
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          background: 'hsla(220,16%,8%,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid hsl(215,14%,16%)',
          padding: '10px 14px',
          display: 'flex', gap: 8,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Message #${activeChannel?.name || 'general'}`}
            style={{
              flex: 1,
              background: 'hsl(220,16%,12%)',
              border: '1px solid hsl(215,14%,22%)',
              borderRadius: 8, padding: '8px 12px',
              fontFamily: 'Inter', fontSize: 13,
              color: 'hsl(210,20%,95%)',
              outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              background: 'hsl(192,91%,54%)',
              color: 'hsl(220,16%,6%)',
              borderRadius: 8, padding: '8px 12px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
