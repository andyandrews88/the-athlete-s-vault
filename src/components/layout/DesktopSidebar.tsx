import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, BookOpen, TrendingUp, Leaf, Users, Shield, UserCog, LogOut, Bot, Briefcase, User, Settings, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import logo from '@/assets/logo.png';

const navItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/train', label: 'Train', icon: Dumbbell },
  { path: '/library', label: 'Library', icon: BookOpen },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/lifestyle', label: 'Lifestyle', icon: Leaf },
  { path: '/community', label: 'Community', icon: Users },
];

const secondaryItems = [
  { path: '/ai', label: 'AI Coach', icon: Bot },
  { path: '/my-coaching', label: 'My Coaching', icon: Briefcase },
];

const bottomItems = [
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/referral', label: 'Refer a Friend', icon: Gift },
];

const adminItems = [
  { path: '/admin', label: 'Admin Dashboard', icon: Shield },
];

export const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { isAdmin } = useAdminRole();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[240px] flex flex-col z-50 border-r border-border"
      style={{ background: 'hsl(220, 16%, 9%)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6">
        <img src={logo} alt="The Vault" className="h-7 w-auto brightness-0 invert" />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {/* Divider + secondary items */}
        <div className="my-2 mx-3 border-t border-border" />
        {secondaryItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom nav items */}
      <div className="px-3 py-2 border-t border-border space-y-1">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div className="px-3 py-2 border-t border-border">
          <p className="px-3 py-1 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Admin</p>
          {adminItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-mono text-[10px] text-primary">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{profile?.full_name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-muted/50 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
