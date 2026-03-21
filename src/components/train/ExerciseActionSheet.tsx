import { useState } from 'react';
import {
  History, ArrowUp, ArrowDown, Link2, Unlink,
  RefreshCw, Trash2, X,
} from 'lucide-react';

interface ExerciseActionSheetProps {
  exerciseName: string;
  exerciseIndex: number;
  onClose: () => void;
  onLoadLastSession: () => void;
  onReplaceExercise: () => void;
  onRemoveExercise: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLinkSuperset: () => void;
  onUnlinkSuperset: () => void;
  hasSuperset: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color?: string;
  onClick: () => void;
  destructive?: boolean;
}

const ActionRow = ({ icon, label, sub, color, onClick, destructive }: ActionRowProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 transition-colors"
    style={{
      padding: '14px 0',
      borderBottom: '1px solid hsl(var(--border))',
      background: 'transparent', border: 'none',
      borderBottomWidth: 1, borderBottomStyle: 'solid',
      borderBottomColor: 'hsl(var(--border))',
      cursor: 'pointer', textAlign: 'left',
    }}
  >
    <div style={{ color: color || 'hsl(var(--mid))', flexShrink: 0 }}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p style={{
        fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
        color: destructive ? 'hsl(var(--bad))' : 'hsl(var(--text))',
      }}>
        {label}
      </p>
      {sub && (
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          color: 'hsl(var(--dim))', marginTop: 2,
        }}>
          {sub}
        </p>
      )}
    </div>
  </button>
);

export const ExerciseActionSheet = ({
  exerciseName,
  onClose,
  onLoadLastSession,
  onReplaceExercise,
  onRemoveExercise,
  onMoveUp,
  onMoveDown,
  onLinkSuperset,
  onUnlinkSuperset,
  hasSuperset,
  canMoveUp,
  canMoveDown,
}: ExerciseActionSheetProps) => {
  const [confirmRemove, setConfirmRemove] = useState(false);

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
          padding: '12px 16px 24px',
          maxWidth: 480, margin: '0 auto',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center" style={{ marginBottom: 12 }}>
          <div style={{
            width: 32, height: 4, borderRadius: 2,
            background: 'hsl(var(--border2))',
          }} />
        </div>

        {/* Exercise name */}
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
          color: 'hsl(var(--text))', marginBottom: 8,
        }}>
          {exerciseName}
        </p>

        {/* Actions */}
        <div>
          <ActionRow
            icon={<History size={16} />}
            label="Load Last Session"
            sub="Auto-fill sets from previous workout"
            color="hsl(var(--primary))"
            onClick={() => { onLoadLastSession(); onClose(); }}
          />

          {canMoveUp && (
            <ActionRow
              icon={<ArrowUp size={16} />}
              label="Move Up"
              onClick={() => { onMoveUp(); onClose(); }}
            />
          )}

          {canMoveDown && (
            <ActionRow
              icon={<ArrowDown size={16} />}
              label="Move Down"
              onClick={() => { onMoveDown(); onClose(); }}
            />
          )}

          {hasSuperset ? (
            <ActionRow
              icon={<Unlink size={16} />}
              label="Unlink Superset"
              color="hsl(var(--warn))"
              onClick={() => { onUnlinkSuperset(); onClose(); }}
            />
          ) : (
            <ActionRow
              icon={<Link2 size={16} />}
              label="Link Superset"
              color="hsl(var(--warn))"
              onClick={() => { onLinkSuperset(); onClose(); }}
            />
          )}

          <ActionRow
            icon={<RefreshCw size={16} />}
            label="Replace Exercise"
            onClick={() => { onReplaceExercise(); onClose(); }}
          />

          {!confirmRemove ? (
            <ActionRow
              icon={<Trash2 size={16} />}
              label="Remove Exercise"
              color="hsl(var(--bad))"
              destructive
              onClick={() => setConfirmRemove(true)}
            />
          ) : (
            <div className="flex items-center gap-2 py-3">
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--bad))', flex: 1 }}>
                Remove {exerciseName}?
              </p>
              <button
                onClick={() => { onRemoveExercise(); onClose(); }}
                style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  padding: '6px 14px', borderRadius: 6,
                  background: 'hsl(var(--bad))', color: 'hsl(var(--text))',
                  border: 'none', fontWeight: 600,
                }}
              >
                Yes, Remove
              </button>
              <button
                onClick={() => setConfirmRemove(false)}
                style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  padding: '6px 14px', borderRadius: 6,
                  background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))',
                  border: '1px solid hsl(var(--border))', fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 12, padding: '12px 0',
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--dim))',
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
          }}
        >
          Cancel
        </button>
      </div>
    </>
  );
};
