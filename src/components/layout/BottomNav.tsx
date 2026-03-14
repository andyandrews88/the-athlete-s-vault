import { useState, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, BookOpen, TrendingUp, MoreHorizontal, Leaf, Apple, Users, User, Settings, Gift } from 'lucide-react';

const tabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/train', label: 'Train', icon: Dumbbell },
  { path: '/library', label: 'Library', icon: BookOpen },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '__more__', label: 'More', icon: MoreHorizontal },
];

const moreItems = [
  { path: '/lifestyle', label: 'Lifestyle', icon: Leaf },
  { path: '/nutrition', label: 'Nutrition', icon: Apple },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/referral', label: 'Refer a Friend', icon: Gift },
];

const VISIBLE_ROUTES = ['/home', '/train', '/library', '/progress', '/lifestyle', '/nutrition', '/community', '/profile', '/settings', '/referral'];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleMoreTap = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setSheetOpen(prev => !prev);
  }, []);

  const handleItemTap = useCallback((path: string) => {
    setSheetOpen(false);
    navigate(path);
  }, [navigate]);

  const handleOverlayTap = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const showNav = VISIBLE_ROUTES.includes(location.pathname);
  if (!showNav) return null;

  return (
      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] transition-opacity duration-200"
          style={{ background: 'hsla(0,0%,0%,0.6)' }}
          onClick={handleOverlayTap}
        />
      )}

      {/* Bottom sheet */}
      <div
        className="fixed left-0 right-0 z-[70] transition-transform duration-300 ease-out"
        style={{
          bottom: 60,
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          background: 'hsl(var(--bg2))',
          borderRadius: '20px 20px 0 0',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-4">
          <div
            className="rounded-full"
            style={{
              width: 40,
              height: 4,
              background: 'hsl(var(--bg4))',
            }}
          />
        </div>

        {/* Grid of module cards 2×3 */}
        <div className="grid grid-cols-3 gap-3 px-5 pb-6">
          {moreItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleItemTap(item.path)}
              className="flex flex-col items-center justify-center gap-2 rounded-[12px] p-4 transition-colors active:opacity-70"
              style={{
                background: 'hsl(var(--bg3))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <item.icon size={24} className="text-primary" />
              <span
                className="font-medium text-center leading-tight"
                style={{
                  fontSize: 11,
                  color: 'hsl(var(--mid))',
                  fontFamily: 'Inter, sans-serif',
                }}
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
        style={{
          background: 'hsl(var(--bg))',
          borderTop: '1px solid hsl(var(--border))',
        }}
      >
        {tabs.map((tab) => {
          if (tab.path === '__more__') {
            return (
              <button
                key="more"
                onClick={handleMoreTap}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 ${
                  sheetOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon size={20} strokeWidth={sheetOpen ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium tracking-wider">{tab.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={() => setSheetOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 ${
                  isActive && !sheetOpen ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} strokeWidth={isActive && !sheetOpen ? 2.5 : 1.5} />
                  <span className="text-[10px] font-medium tracking-wider">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
