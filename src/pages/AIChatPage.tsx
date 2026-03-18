import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  "Analyse my last workout",
  "Am I recovering well?",
  "What's missing in my nutrition?",
];

const AIChatPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load today's usage
  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    supabase
      .from('ai_usage')
      .select('prompt_count')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .single()
      .then(({ data }) => {
        if (data) setPromptsUsed(data.prompt_count);
      });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !user) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            userId: user.id,
            context: 'general',
          }),
        }
      );

      const data = await res.json();

      if (data.limitReached) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "You've hit your daily free prompt limit. Upgrade for unlimited access to the AI Coach.",
        }]);
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setPromptsUsed(prev => prev + 1);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-24 flex flex-col">
      <div className="max-w-lg mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="font-display text-2xl tracking-wider">THE VAULT AI</h1>
          <p className="font-mono text-[9px] tracking-wider" style={{ color: 'hsl(var(--dim))' }}>
            Knows your data. Speaks in Andy's voice.
          </p>
        </div>

        {/* Free user prompt counter */}
        {profile?.tier === 'free' && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{
              background: 'hsla(0,72%,51%,0.04)',
              border: '1px solid hsla(0,72%,51%,0.2)',
            }}
          >
            <p className="text-[11px] font-mono" style={{ color: 'hsl(var(--mid))' }}>
              ⚡ {promptsUsed} of 2 free prompts used today.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="text-[10px] font-mono font-semibold mt-1"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Upgrade for unlimited →
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && !loading && (
            <div>
              <p className="font-mono text-[8px] uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--dim))' }}>
                QUICK PROMPTS
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-[7px] px-[9px] py-[6px] text-left transition-colors active:opacity-70"
                    style={{
                      background: 'hsl(var(--bg3))',
                      border: '1px solid hsl(var(--border))',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 8,
                      color: 'hsl(var(--mid))',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-start gap-2 max-w-[85%]">
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                      background: 'hsla(38,92%,50%,0.1)',
                      border: '1px solid hsla(38,92%,50%,0.2)',
                      color: 'hsl(var(--gold))',
                    }}
                  >
                    A
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-semibold" style={{ color: 'hsl(var(--gold))' }}>Andy</span>
                      <span className="font-mono text-[8px]" style={{ color: 'hsl(var(--dim))' }}>
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className="rounded-lg px-[8px] py-[5px]"
                      style={{
                        background: 'hsl(var(--bg3))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px 8px 8px 3px',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 9,
                        color: 'hsl(var(--mid))',
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div
                  className="max-w-[85%] px-[8px] py-[5px]"
                  style={{
                    background: 'hsl(var(--pgb))',
                    border: '1px solid hsla(192,91%,54%,0.2)',
                    borderRadius: '8px 3px 8px 8px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 9,
                    color: 'hsl(var(--text))',
                  }}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{
                    background: 'hsla(38,92%,50%,0.1)',
                    border: '1px solid hsla(38,92%,50%,0.2)',
                    color: 'hsl(var(--gold))',
                  }}
                >
                  A
                </div>
                <div
                  className="rounded-lg px-3 py-2 flex items-center gap-1"
                  style={{
                    background: 'hsl(var(--bg3))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px 8px 8px 3px',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 outline-none"
            style={{
              background: 'hsl(var(--bg3))',
              border: '1px solid hsla(192,91%,54%,0.25)',
              borderRadius: 7,
              padding: '7px 9px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 9,
              color: 'hsl(var(--text))',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="disabled:opacity-40 transition-opacity"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(220,16%,6%)',
              borderRadius: 7,
              padding: '7px 10px',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
