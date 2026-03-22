import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ProgrammeTemplate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  days_per_week: number;
  duration_weeks: number;
  difficulty: string;
  tags: string[] | null;
  display_order: number;
  required_tier: string;
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const bebas: React.CSSProperties = { fontFamily: "'Bebas Neue', cursive" };

const ProgrammeSelectPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: templates = [] } = useQuery({
    queryKey: ['programmeTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programme_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as ProgrammeTemplate[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Get user's active programme to check template_id
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
    staleTime: 1000 * 60 * 5,
  });

  const tier = profile?.tier || 'free';
  const joinedDate = profile?.created_at ? new Date(profile.created_at) : new Date();
  const daysSinceJoin = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
  const isFirstMonth = daysSinceJoin < 30;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'hsl(var(--bg))', padding: '12px 16px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 pt-10">
        <button onClick={() => navigate('/train')} style={{ color: 'hsl(var(--dim))' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ ...bebas, fontSize: 28, color: 'hsl(var(--text))', letterSpacing: 2, lineHeight: 1 }}>PROGRAMMES</h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--dim))' }}>Choose your training path</p>
        </div>
      </div>

      {/* Tier notices */}
      {tier === 'free' && !isFirstMonth && (
        <div style={{
          background: 'hsla(38,92%,50%,0.07)',
          border: '1px solid hsla(38,92%,50%,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--warn))' }}>
            ⚡ Free plan — 1 programme active at a time
          </p>
          <button onClick={() => navigate('/pricing')} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
            Upgrade to Premium to switch anytime →
          </button>
        </div>
      )}

      {isFirstMonth && (
        <div style={{
          background: 'hsla(192,91%,54%,0.07)',
          border: '1px solid hsla(192,91%,54%,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--primary))' }}>
            🎉 Free trial — full access for your first 30 days
          </p>
        </div>
      )}

      {/* Programme cards */}
      {templates.map(t => {
        const isActive = activeProgramme?.template_id === t.id;
        return (
          <div
            key={t.id}
            style={{
              background: isActive
                ? 'linear-gradient(135deg, hsla(192,91%,54%,0.05), hsl(var(--bg2)))'
                : 'hsl(var(--bg2))',
              border: isActive
                ? '1px solid hsla(192,91%,54%,0.4)'
                : '1px solid hsl(var(--border))',
              borderRadius: 14, padding: 20, marginBottom: 12, position: 'relative',
            }}
          >
            {isActive && (
              <span style={{
                position: 'absolute', top: 12, right: 12,
                background: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))',
                ...mono, fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
              }}>ACTIVE</span>
            )}

            <h2 style={{ ...bebas, fontSize: 24, letterSpacing: 2, color: 'hsl(var(--text))', lineHeight: 1 }}>
              {t.name.toUpperCase()}
            </h2>

            {t.tagline && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--dim))', fontStyle: 'italic', marginBottom: 12 }}>
                {t.tagline}
              </p>
            )}

            {/* Tags */}
            {t.tags && t.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {t.tags.map(tag => (
                  <span key={tag} style={{
                    background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                    ...mono, fontSize: 8, color: 'hsl(var(--dim))',
                    borderRadius: 10, padding: '2px 8px',
                  }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Stats */}
            <p style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginTop: 8 }}>
              {t.days_per_week} days/wk · {t.duration_weeks} weeks · {t.difficulty}
            </p>

            {/* CTA */}
            <button
              onClick={() => navigate(`/programmes/${t.slug}`)}
              style={{
                width: '100%', marginTop: 14,
                background: 'transparent',
                border: '1px solid hsla(192,91%,54%,0.3)',
                color: 'hsl(var(--primary))',
                fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
                padding: '10px 0', borderRadius: 8, cursor: 'pointer',
              }}
            >
              View Programme →
            </button>
          </div>
        );
      })}

      {/* Build Workout card */}
      <div
        onClick={() => navigate('/train')}
        style={{
          background: 'hsl(var(--bg2))',
          border: '1px dashed hsl(var(--border2))',
          borderRadius: 14, padding: 20, textAlign: 'center', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 28 }}>🏋️</span>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, color: 'hsl(var(--text))', marginTop: 8 }}>
          Build Workout
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--dim))', marginTop: 4 }}>
          Log a free session — no programme needed
        </p>
      </div>
    </div>
  );
};

export default ProgrammeSelectPage;
