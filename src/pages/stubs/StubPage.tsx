import type { LucideIcon } from 'lucide-react';

interface StubPageProps {
  icon: LucideIcon;
  name: string;
}

const StubPage = ({ icon: Icon, name }: StubPageProps) => {
  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-[60px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Icon size={48} className="text-vault-dim" />
        <h1 className="font-display text-3xl tracking-wide">{name}</h1>
        <p className="text-vault-dim text-sm font-mono">Coming soon</p>
      </div>
    </div>
  );
};

export default StubPage;
