import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProgrammeTemplate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  who_its_for: string | null;
  what_to_expect: string | null;
  sample_week: { day: string; focus: string }[] | null;
  days_per_week: number;
  duration_weeks: number;
  difficulty: string;
  tags: string[] | null;
  required_tier: string;
  video_url: string | null;
}

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const bebas: React.CSSProperties = { fontFamily: "'Bebas Neue', cursive" };

const ProgrammeLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['programmeTemplate', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programme_templates')
        .select('*')
        .eq('slug', slug!)
        .single();
      if (error) throw error;
      return data as unknown as ProgrammeTemplate;
    },
    enabled: !!slug,
  });

  const { data: activeProgramme } = useQuery({
    queryKey: ['userActiveProgramme', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_programmes')
        .select('id, name, template_id, is_active')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const isActive = activeProgramme?.template_id === template?.id;
  const tier = profile?.tier || 'free';
  const joinedDate = profile?.created_at ? new Date(profile.created_at) : new Date();
  const daysSinceJoin = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
  const hasExistingProgramme = !!activeProgramme;

  const startProgramme = async () => {
    if (!user || !template) return;
    setSwitching(true);
    try {
      // Deactivate all existing programmes
      await supabase
        .from('training_programmes')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Create new active programme
      await supabase
        .from('training_programmes')
        .insert({
          user_id: user.id,
          name: template.name,
          template_id: template.id,
          is_active: true,
          days_per_week: template.days_per_week,
          weeks: template.duration_weeks,
          description: template.description,
        } as any);

      queryClient.invalidateQueries({ queryKey: ['userActiveProgramme'] });
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      toast({ title: `${template.name} started!` });
      navigate('/train');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to start programme.' });
    } finally {
      setSwitching(false);
      setShowConfirm(false);
    }
  };

  const handleStartTap = () => {
    if (tier === 'free' && daysSinceJoin > 30 && hasExistingProgramme && !isActive) {
      setShowConfirm(true);
    } else {
      startProgramme();
    }
  };

  if (isLoading || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg))' }}>
        <p style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>Loading...</p>
      </div>
    );
  }

  const sampleWeek = (template.sample_week || []) as { day: string; focus: string }[];

  return (
    <div className="min-h-screen pb-32" style={{ background: 'hsl(var(--bg))', padding: '12px 16px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pt-10">
        <button onClick={() => navigate('/programmes')} style={{ color: 'hsl(var(--dim))' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ ...bebas, fontSize: 32, color: 'hsl(var(--text))', letterSpacing: 2, lineHeight: 1 }}>
            {template.name.toUpperCase()}
          </h1>
          {template.tagline && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'hsl(var(--dim))', fontStyle: 'italic' }}>
              {template.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Video */}
      {template.video_url && extractYouTubeId(template.video_url) ? (
        <div style={{
          width: '100%', aspectRatio: '16/9', borderRadius: 12,
          overflow: 'hidden', marginBottom: 16, background: 'hsl(var(--bg3))',
        }}>
          <iframe
            width="100%" height="100%"
            src={`https://www.youtube.com/embed/${extractYouTubeId(template.video_url)}?rel=0&modestbranding=1`}
            frameBorder={0}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
          />
        </div>
      ) : (
        <div style={{
          width: '100%', aspectRatio: '16/9', borderRadius: 12,
          overflow: 'hidden', marginBottom: 16, background: 'hsl(var(--bg3))',
          border: '1px dashed hsl(var(--border2))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 48, color: 'hsl(var(--dim))' }}>▶</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--dim))', marginTop: 8 }}>Video coming soon</span>
        </div>
      )}

      {/* Hero stats */}
      <div style={{
        background: 'hsla(192,91%,54%,0.05)',
        border: '1px solid hsla(192,91%,54%,0.15)',
        borderRadius: 12, padding: 20, marginBottom: 20,
      }}>
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.map(tag => (
              <span key={tag} style={{
                background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                ...mono, fontSize: 8, color: 'hsl(var(--dim))',
                borderRadius: 10, padding: '2px 8px',
              }}>{tag}</span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-4" style={{ ...mono, fontSize: 10, color: 'hsl(var(--dim))' }}>
          <span>📅 {template.days_per_week} days/week</span>
          <span>⏱ {template.duration_weeks} weeks</span>
          <span>💪 {template.difficulty}</span>
        </div>
      </div>

      {/* About */}
      {template.description && (
        <Section title="ABOUT THIS PROGRAMME">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'hsl(var(--mid))', lineHeight: 1.7 }}>
            {template.description}
          </p>
        </Section>
      )}

      {/* Who it's for */}
      {template.who_its_for && (
        <Section title="WHO IT'S FOR">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'hsl(var(--mid))', lineHeight: 1.7 }}>
            {template.who_its_for}
          </p>
        </Section>
      )}

      {/* What to expect */}
      {template.what_to_expect && (
        <Section title="WHAT TO EXPECT">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'hsl(var(--mid))', lineHeight: 1.7 }}>
            {template.what_to_expect}
          </p>
        </Section>
      )}

      {/* Sample week */}
      {sampleWeek.length > 0 && (
        <Section title="SAMPLE TRAINING WEEK">
          <div className="space-y-1">
            {sampleWeek.map((d, i) => {
              const isRest = d.focus.toLowerCase().includes('rest');
              return (
                <div key={i} className="flex items-start gap-3" style={{
                  background: 'hsl(var(--bg3))', borderRadius: 8, padding: '10px 14px',
                }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: 'hsl(var(--primary))', width: 90, flexShrink: 0 }}>
                    {d.day}
                  </span>
                  <span style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 12,
                    color: isRest ? 'hsl(var(--dim))' : 'hsl(var(--mid))',
                    fontStyle: isRest ? 'italic' : 'normal',
                  }}>
                    {d.focus}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Sticky CTA */}
      <div style={{
        position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 40,
        background: 'hsla(220,16%,8%,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(var(--border))', padding: '12px 16px',
      }}>
        {isActive ? (
          <>
            <button
              onClick={() => navigate('/train')}
              style={{
                width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
                fontWeight: 700, fontSize: 13, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              }}
            >
              Continue Training →
            </button>
            <button
              onClick={() => navigate('/programmes')}
              style={{
                width: '100%', background: 'none', border: 'none',
                color: 'hsl(var(--dim))', fontSize: 11, marginTop: 8, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Switch Programme
            </button>
          </>
        ) : (
          <button
            onClick={handleStartTap}
            disabled={switching}
            style={{
              width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
              fontWeight: 700, fontSize: 13, padding: '12px 0', borderRadius: 8, border: 'none',
              cursor: switching ? 'not-allowed' : 'pointer', opacity: switching ? 0.6 : 1,
            }}
          >
            {switching ? 'Starting...' : 'Start Programme'}
          </button>
        )}
      </div>

      {/* Confirmation sheet */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'hsla(220,16%,6%,0.7)', display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'hsl(var(--bg2))',
              borderTop: '1px solid hsl(var(--border2))',
              borderRadius: '20px 20px 0 0', padding: 24,
            }}
          >
            <div style={{ width: 32, height: 4, background: 'hsl(var(--border2))', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ ...bebas, fontSize: 22, color: 'hsl(var(--text))', marginBottom: 8 }}>
              Switch to {template.name}?
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--dim))', marginBottom: 20 }}>
              This will replace your current programme. Your history is saved.
            </p>
            <button
              onClick={startProgramme}
              disabled={switching}
              style={{
                width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
                fontWeight: 700, fontSize: 13, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              }}
            >
              {switching ? 'Switching...' : 'Switch'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                width: '100%', background: 'none', border: 'none',
                color: 'hsl(var(--dim))', fontSize: 12, marginTop: 10, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <p style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 2,
      marginBottom: 10,
    }}>{title}</p>
    {children}
  </div>
);

export default ProgrammeLandingPage;
