import { useEffect, useMemo } from 'react';

interface PRCelebrationProps {
  exerciseName: string;
  weight: number;
  unit: 'kg' | 'lbs';
  onDismiss: () => void;
}

export const PRCelebration = ({ exerciseName, weight, unit, onDismiss }: PRCelebrationProps) => {
  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  // Generate confetti pieces
  const confetti = useMemo(() => {
    const colors = [
      'hsl(192,91%,54%)',  // primary
      'hsl(142,71%,45%)',  // ok
      'hsl(45,93%,58%)',   // gold
      'hsl(38,92%,50%)',   // warn
    ];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 0.8,
      duration: 1 + Math.random() * 2,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'hsla(220,16%,6%,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {/* Confetti */}
      {confetti.map(c => (
        <div
          key={c.id}
          style={{
            position: 'absolute',
            left: `${c.left}%`,
            top: -10,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: c.size > 9 ? 2 : 1,
            transform: `rotate(${c.rotation}deg)`,
            animation: `confettiFall ${c.duration}s ease-in ${c.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}

      {/* Trophy */}
      <div style={{
        fontSize: 64,
        animation: 'trophyBounce 0.6s ease-out forwards',
      }}>
        🏆
      </div>

      {/* NEW PR */}
      <h2 style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 48,
        color: 'hsl(var(--gold))',
        letterSpacing: 4,
        marginTop: 16,
        lineHeight: 1,
      }}>
        NEW PR
      </h2>

      {/* Exercise name */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 18, fontWeight: 600,
        color: 'hsl(var(--text))',
        marginTop: 8,
        textAlign: 'center',
      }}>
        {exerciseName}
      </p>

      {/* Weight */}
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 32, fontWeight: 700,
        color: 'hsl(var(--primary))',
        marginTop: 4,
      }}>
        {weight}{unit}
      </p>

      {/* Dismiss hint */}
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        color: 'hsl(var(--dim))',
        marginTop: 24,
      }}>
        Tap to dismiss
      </p>

      {/* Keyframes */}
      <style>{`
        @keyframes confettiFall {
          0% { top: -10px; opacity: 1; }
          100% { top: 100vh; opacity: 0; }
        }
        @keyframes trophyBounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
