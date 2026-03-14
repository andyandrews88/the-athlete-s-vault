import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, Settings, LogOut } from 'lucide-react';
import logo from '@/assets/logo.png';

const VISIBLE_ROUTES = ['/home', '/train', '/lifestyle', '/nutrition', '/progress', '/library', '/community'];

export const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!VISIBLE_ROUTES.includes(location.pathname)) return null;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 h-12 z-50 flex items-center justify-between px-4"
        style={{
          background: 'hsla(220,16%,6%,0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <span className="font-display text-xl text-primary tracking-[3px]">THE VAULT</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-[30px] h-[30px] rounded-full bg-vault-bg3 border border-vault-border2 flex items-center justify-center font-mono text-[10px] text-primary"
        >
          {initials}
        </button>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-vault-bg2 border-t border-vault-border2 rounded-t-2xl p-6 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-vault-text hover:bg-vault-bg3 transition-colors text-left">
              <User size={18} />
              <span className="text-sm">Profile</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-vault-text hover:bg-vault-bg3 transition-colors text-left">
              <Settings size={18} />
              <span className="text-sm">Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-vault-bad hover:bg-vault-bg3 transition-colors text-left"
            >
              <LogOut size={18} />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
