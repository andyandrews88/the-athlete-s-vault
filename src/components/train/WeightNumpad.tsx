import { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface WeightNumpadProps {
  value: number | null;
  unit: 'kg' | 'lbs';
  onConfirm: (value: number) => void;
  onClose: () => void;
  onToggleUnit?: () => void;
  previousValue?: number | null;
  label?: string;
}

const LB_PER_KG = 2.20462;

export const WeightNumpad = ({
  value,
  unit,
  onConfirm,
  onClose,
  onToggleUnit,
  previousValue,
  label = 'WEIGHT',
}: WeightNumpadProps) => {
  const [display, setDisplay] = useState(value !== null ? String(value) : '');

  const handleKey = useCallback((key: string) => {
    setDisplay(prev => {
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      if (key === '.' && prev === '') return '0.';
      return prev + key;
    });
  }, []);

  const handleConfirm = () => {
    const num = parseFloat(display);
    onConfirm(isNaN(num) ? 0 : num);
  };

  const handleBWOnly = () => {
    onConfirm(0);
  };

  const handlePreviousFill = () => {
    if (previousValue !== null && previousValue !== undefined) {
      setDisplay(String(previousValue));
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'hsla(220,16%,6%,0.6)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
          background: 'hsl(var(--bg2))',
          borderTop: '1px solid hsl(var(--border2))',
          borderRadius: '20px 20px 0 0',
          padding: 16,
          maxWidth: 480, margin: '0 auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {label}
          </span>

          <div className="flex items-center gap-2">
            {onToggleUnit && (
              <div style={{
                display: 'flex', borderRadius: 6, overflow: 'hidden',
                border: '1px solid hsl(var(--border))',
              }}>
                {(['kg', 'lbs'] as const).map(u => (
                  <button
                    key={u}
                    onClick={onToggleUnit}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                      padding: '4px 10px', border: 'none',
                      background: unit === u ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                      color: unit === u ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                      fontWeight: unit === u ? 700 : 400,
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} style={{ color: 'hsl(var(--dim))', background: 'none', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Value display */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 32,
            color: 'hsl(var(--primary))', fontWeight: 700,
          }}>
            {display || '0'}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
            color: 'hsl(var(--dim))', marginLeft: 4,
          }}>
            {label === 'REPS' ? '' : unit}
          </span>
        </div>

        {/* Previous hint */}
        {previousValue !== null && previousValue !== undefined && (
          <button
            onClick={handlePreviousFill}
            style={{
              display: 'block', margin: '0 auto 12px', background: 'none', border: 'none',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              color: 'hsl(var(--dim))', cursor: 'pointer',
            }}
          >
            Previous: {previousValue}{label === 'REPS' ? '' : unit} · tap to fill
          </button>
        )}

        {/* Numpad grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6, marginBottom: 10,
        }}>
          {keys.map(key => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              style={{
                height: 56, borderRadius: 10,
                background: 'hsl(var(--bg3))',
                border: '1px solid hsl(var(--border))',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 20, fontWeight: 600,
                color: 'hsl(var(--text))',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              className="active:bg-[hsl(var(--bg4))] transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex gap-2">
          {label !== 'REPS' && (
            <button
              onClick={handleBWOnly}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                padding: '14px 16px', borderRadius: 10,
                background: 'hsl(var(--bg3))',
                color: 'hsl(var(--dim))',
                border: '1px solid hsl(var(--border))',
                fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              BW Only
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
              padding: '14px 0', borderRadius: 10,
              background: 'hsl(var(--primary))',
              color: 'hsl(220,16%,6%)',
              border: 'none', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
};
