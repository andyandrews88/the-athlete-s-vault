import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StubPageProps {
  icon: LucideIcon;
  name: string;
}

const StubPage = ({ icon: Icon, name }: StubPageProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-[60px] px-4">
      <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')} className="flex items-center gap-2 p-0 mb-6">
        <ArrowLeft size={18} className="text-primary" />
        <span className="text-xs" style={{ color: 'hsl(var(--dim))' }}>Back</span>
      </button>
      <div className="flex flex-col items-center gap-4 text-center pt-20">
        <Icon size={48} className="text-vault-dim" />
        <h1 className="font-display text-3xl tracking-wide">{name}</h1>
        <p className="text-vault-dim text-sm font-mono">Coming soon</p>
      </div>
    </div>
  );
};

export default StubPage;
