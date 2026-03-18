import { useState, useCallback, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, BookOpen, TrendingUp, MoreHorizontal, Leaf, Apple, Users, User, Settings, Gift, Briefcase, Shield, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navTabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/train', label: 'Train', icon: Dumbbell },
  { path: '/library', label: 'Library', icon: BookOpen },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '__more__', label: 'More', icon: MoreHorizontal },
];

const moreItems = [
  { path: '/lifestyle', label: 'Lifestyle', icon: Leaf },
  { path: '/nutrition', label: 'Nutrition', icon: Apple },
  { path: '/my-coaching', label: 'My Coaching', icon: Briefcase },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/referral', label: 'Refer a Friend', icon: Gift },
];

const VISIBLE_ROUTES = ['/home', '/train', '/library', '/progress', '/lifestyle', '/nutrition', '/community', '/profile', '/settings', '/referral', '/my-coaching', '/ai'];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [sheetOpen, setSheetOpen] = useState(false);

  const gridItems = useMemo(() => {
    const aiItem = { path: '/ai', label: 'AI Coach', icon: Bot, isAI: true };
    const base = [aiItem, ...moreItems];
    if (isAdmin) {
      return [{ path: '/admin', label: 'Admin', icon: Shield, isAdmin: true }, ...base];
    }
    return base;
  }, [isAdmin]);

  const handleMoreTap = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setSheetOpen((prev) => !prev);
  }, []);

  const handleItemTap = useCallback(
    (path: string) => {
      setSheetOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const handleOverlayTap = useCallback(() => {
    setSheetOpen(false);
  }, []);

  if (location.pathname.startsWith('/admin')) return null;
  if (!VISIBLE_ROUTES.includes(location.pathname)) return null;

  return (
    <>
      {/* Overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] transition-opacity duration-200"
          style={{ background: 'hsla(0,0%,0%,0.6)' }}
          onClick={handleOverlayTap}
        />
      )}

      {/* Bottom sheet */}
      <div
        className="fixed left-0 right-0 z-[70] transition-transform duration-300 ease-out mx-auto"
        style={{
          bottom: 60,
          maxWidth: 480,
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          background: 'hsl(var(--bg2))',
          borderRadius: '20px 20px 0 0',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="rounded-full" style={{ width: 40, height: 4, background: 'hsl(var(--bg4))' }} />
        </div>

        {/* 2×3 grid */}
        <div className="grid grid-cols-3 gap-3 px-5 pb-6">
          {gridItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleItemTap(item.path)}
              className="flex flex-col items-center justify-center gap-2 rounded-[12px] p-4 transition-colors active:opacity-70"
              style={{
                background: 'isAI' in item && item.isAI ? 'hsla(192,91%,54%,0.06)' : 'hsl(var(--bg3))',
                border: `1px solid hsl(var(--${'isAdmin' in item && item.isAdmin ? 'warn' : 'isAI' in item && item.isAI ? 'primary' : 'border'}))`,
              }}
            >
              <item.icon size={24} style={{ color: 'isAdmin' in item && item.isAdmin ? 'hsl(var(--warn))' : 'hsl(var(--primary))' }} />
              <span
                className="font-medium text-center leading-tight"
                style={{ fontSize: 11, color: 'isAdmin' in item && item.isAdmin ? 'hsl(var(--warn))' : 'hsl(var(--mid))', fontFamily: 'Inter, sans-serif' }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[60px] z-[80] px-4 flex items-center justify-around"
        style={{ background: 'hsl(var(--bg))', borderTop: '1px solid hsl(var(--border))' }}
      >
        {navTabs.map((tab) => {
          if (tab.path === '__more__') {
            const isActive = sheetOpen;
            return (
              <button
                key="more"
                onClick={handleMoreTap}
                className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200"
              >
                {isActive ? (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <tab.icon size={18} strokeWidth={2.5} className="text-primary" />
                  </div>
                ) : (
                  <tab.icon size={20} strokeWidth={1.5} className="text-muted-foreground" />
                )}
                <span className={isActive ? "text-[10px] font-semibold text-primary tracking-wider" : "text-[10px] font-medium text-muted-foreground tracking-wider"}>{tab.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={() => setSheetOpen(false)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200"
            >
              {({ isActive: active }) => {
                const isActive = active && !sheetOpen;
                return (
                  <>
                    {isActive ? (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <tab.icon size={18} strokeWidth={2.5} className="text-primary" />
                      </div>
                    ) : (
                      <tab.icon size={20} strokeWidth={1.5} className="text-muted-foreground" />
                    )}
                    <span className={isActive ? "text-[10px] font-semibold text-primary tracking-wider" : "text-[10px] font-medium text-muted-foreground tracking-wider"}>{tab.label}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
